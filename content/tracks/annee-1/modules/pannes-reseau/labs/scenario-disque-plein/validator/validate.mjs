#!/usr/bin/env node

/**
 * Validateur du scénario S7 — Disque presque plein
 * Conforme au contrat OpenSIO (§26.3).
 *
 * Réponses correctes :
 *   diagnostic_volume    → "b"  (le volume / est saturé, /var/log/nginx est la cause principale)
 *   diagnostic_logrotate → "a"  (postrotate manquant dans logrotate.d/nginx : Nginx ne rouvre pas)
 *   remediation_immediate → "c" (logrotate -f + corriger postrotate + nginx -s reopen)
 *   remediation_preventive → "b" (déplacer /var/log vers /data + supervision espace disque)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CORRECT_ANSWERS = {
  diagnostic_volume: 'b',
  diagnostic_logrotate: 'a',
  remediation_immediate: 'c',
  remediation_preventive: 'b',
};

const CHECK_CONFIG = {
  diagnostic_volume: { points: 20, required: true },
  diagnostic_logrotate: { points: 40, required: true },
  remediation_immediate: { points: 25, required: true },
  remediation_preventive: { points: 15, required: false },
};

export function validateScenarioDisquePlein(workDir = '/work') {
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
    const { points } = CHECK_CONFIG[check.id];

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
    diagnostic_volume:
      'Correct : "df -h" révèle que / est à 98%, et "du -sh /var/log/*" identifie /var/log/nginx (18 Go) comme la cause principale.',
    diagnostic_logrotate:
      'Correct : la configuration logrotate manque de la directive "postrotate / nginx -s reopen / endscript" — Nginx continue d\'écrire dans l\'ancien descripteur de fichier, gonflant les logs.',
    remediation_immediate:
      'Correct : "logrotate -f /etc/logrotate.d/nginx" force la rotation immédiate, puis corriger la config avec "postrotate" pour que Nginx rouvre ses fichiers de log.',
    remediation_preventive:
      'Correct : déplacer /var/log vers le volume /data (500G disponible) et configurer une alerte de supervision avant 85% sont les mesures préventives appropriées.',
  };
  return messages[id] ?? 'Réponse correcte.';
}

function getFailureMessage(id, given) {
  const messages = {
    diagnostic_volume:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Relisez "df -h" : le volume "/" est à 98%, et "du -sh /var/log/*" montre /var/log/nginx à 18 Go.`,
    diagnostic_logrotate:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Examinez /etc/logrotate.d/nginx : la directive "postrotate" est absente. Sans elle, Nginx conserve l\'ancien descripteur de fichier même après rotation.`,
    remediation_immediate:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). La suppression manuelle des anciens logs est risquée. La bonne approche est "logrotate -f" + correction de la config.`,
    remediation_preventive:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). La meilleure mesure préventive combine déplacement des logs vers /data (grand volume) et supervision de l\'espace disque.`,
  };
  return messages[id] ?? `Réponse incorrecte (reçu : "${given ?? 'non fournie'}").`;
}

function buildVerdict(checks) {
  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const requiredPassed = checks
    .filter((c) => CHECK_CONFIG[c.id]?.required)
    .every((c) => c.passed);
  return {
    passed: requiredPassed && score >= 80,
    score,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateScenarioDisquePlein(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
