#!/usr/bin/env node

/**
 * Validateur du scénario S2 — Résolution DNS incorrecte
 * Conforme au contrat OpenSIO (§26.3).
 *
 * Réponses correctes :
 *   diagnostic_nxdomain  → "b"  (le serveur fait autorité mais l'enregistrement est absent/commenté)
 *   diagnostic_zone      → "a"  (enregistrement A pour mail commenté dans le fichier de zone)
 *   remediation_zone     → "c"  (décommenter + rndc reload)
 *   remediation_forwarder → "b"  (remplacer 192.168.0.254 par un résolveur fiable)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CORRECT_ANSWERS = {
  diagnostic_nxdomain: 'b',
  diagnostic_zone: 'a',
  remediation_zone: 'c',
  remediation_forwarder: 'b',
};

const CHECK_CONFIG = {
  diagnostic_nxdomain: { points: 25, required: true },
  diagnostic_zone: { points: 35, required: true },
  remediation_zone: { points: 25, required: true },
  remediation_forwarder: { points: 15, required: false },
};

export function validateScenarioDns(workDir = '/work') {
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
    diagnostic_nxdomain:
      'Correct : NXDOMAIN indique que le serveur DNS faisant autorité ne possède pas l\'enregistrement demandé dans sa zone.',
    diagnostic_zone:
      'Correct : l\'enregistrement A "mail IN A 10.0.1.25" est commenté (précédé de ";") dans db.entreprise.lan.',
    remediation_zone:
      'Correct : décommenter l\'enregistrement, incrémenter le serial de la SOA, puis recharger avec "rndc reload entreprise.lan".',
    remediation_forwarder:
      'Correct : remplacer le forwarder 192.168.0.254 défaillant par un résolveur fiable (1.1.1.1 ou 8.8.8.8).',
  };
  return messages[id] ?? 'Réponse correcte.';
}

function getFailureMessage(id, given) {
  const messages = {
    diagnostic_nxdomain:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). NXDOMAIN = "Non-Existent Domain" — le serveur répond mais n\'a pas l\'enregistrement, ce n\'est pas un problème de connectivité.`,
    diagnostic_zone:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Relisez db.entreprise.lan : la ligne "mail IN A 10.0.1.25" est précédée d\'un ";", ce qui la rend inactive.`,
    remediation_zone:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Il faut décommenter l\'enregistrement ET recharger la zone (rndc reload ou systemctl reload bind9).`,
    remediation_forwarder:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Le forwarder 192.168.0.254 est injoignable — il faut le remplacer par un résolveur disponible.`,
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
  const verdict = validateScenarioDns(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
