#!/usr/bin/env node

/**
 * Validateur du scénario S6 — Service web arrêté
 * Conforme au contrat OpenSIO (§26.3).
 *
 * Réponses correctes :
 *   diagnostic_502     → "b"  (le backend (port 3000) est inaccessible, Nginx renvoie 502)
 *   diagnostic_service → "a"  (EADDRINUSE : un processus fantôme occupe le port 3000)
 *   remediation        → "c"  (tuer le processus fantôme + systemctl start myapp + vérification ss)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CORRECT_ANSWERS = {
  diagnostic_502: 'b',
  diagnostic_service: 'a',
  remediation: 'c',
};

const CHECK_POINTS = {
  diagnostic_502: 25,
  diagnostic_service: 35,
  remediation: 40,
};

export function validateScenarioWebArrete(workDir = '/work') {
  const answersPath = join(workDir, 'answers.json');

  const checks = Object.keys(CORRECT_ANSWERS).map((id) => ({
    id,
    passed: false,
    points: 0,
    message: '',
  }));

  if (!existsSync(answersPath)) {
    for (const c of checks) c.message = 'Aucune réponse soumise (answers.json introuvable).';
    return buildVerdict(checks);
  }

  let answers;
  try {
    answers = JSON.parse(readFileSync(answersPath, 'utf-8'));
  } catch (err) {
    checks[0].message = `Fichier answers.json invalide : ${err.message}`;
    return buildVerdict(checks);
  }

  const steps = Array.isArray(answers?.steps) ? answers.steps : [];
  const byId = Object.fromEntries(steps.map((s) => [s.id, s.answer]));

  for (const check of checks) {
    const given = byId[check.id];
    const expected = CORRECT_ANSWERS[check.id];
    const points = CHECK_POINTS[check.id];

    if (given === expected) {
      check.passed = true;
      check.points = points;
      check.message = getSuccessMessage(check.id);
    } else {
      check.message = getFailureMessage(check.id, given);
    }
  }

  return buildVerdict(checks);
}

function getSuccessMessage(id) {
  const messages = {
    diagnostic_502:
      'Correct : une erreur 502 Bad Gateway signifie que Nginx ne peut pas établir la connexion vers le backend (port 3000 refusé).',
    diagnostic_service:
      'Correct : EADDRINUSE indique qu\'un processus fantôme occupait le port 3000 lors du démarrage — myapp a échoué à se lier à ce port.',
    remediation:
      'Correct : identifier et tuer le processus fantôme (lsof/kill), relancer myapp.service, puis vérifier avec "ss -tlnp | grep 3000" et un test HTTP.',
  };
  return messages[id] ?? 'Réponse correcte.';
}

function getFailureMessage(id, given) {
  const messages = {
    diagnostic_502:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). 502 = le reverse proxy ne peut pas atteindre l\'upstream. Ce n\'est pas une erreur côté client (400/403) ni une erreur de certificat.`,
    diagnostic_service:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Le message clé est "EADDRINUSE" dans les logs systemd — le port était déjà utilisé. Vérifiez "ss -tlnp | grep 3000".`,
    remediation:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Il faut d\'abord libérer le port (tuer le processus fantôme), puis redémarrer le service et vérifier qu\'il écoute bien.`,
  };
  return messages[id] ?? `Réponse incorrecte (reçu : "${given ?? 'non fournie'}").`;
}

function buildVerdict(checks) {
  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequired = checks.every((c) => c.passed);
  return {
    passed: allRequired && score >= 80,
    score,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateScenarioWebArrete(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
