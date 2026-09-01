#!/usr/bin/env node

/**
 * Validateur du scénario S10 — Mauvaise règle de pare-feu
 * Conforme au contrat OpenSIO (§26.3).
 *
 * Réponses correctes :
 *   diagnostic_ordre  → "a"  (les règles sont évaluées de haut en bas, first-match-wins)
 *   diagnostic_regle  → "c"  (règle drop pour VLAN30/443 avant la règle accept)
 *   remediation       → "b"  (supprimer la règle drop erronée, la règle accept suffit)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CORRECT_ANSWERS = {
  diagnostic_ordre: 'a',
  diagnostic_regle: 'c',
  remediation: 'b',
};

const CHECK_POINTS = {
  diagnostic_ordre: 30,
  diagnostic_regle: 30,
  remediation: 40,
};

export function validateScenarioPareFeu(workDir = '/work') {
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
    diagnostic_ordre:
      'Correct : nftables évalue les règles de haut en bas ("first-match"). Dès qu\'une règle correspond, son verdict est appliqué et les règles suivantes sont ignorées.',
    diagnostic_regle:
      'Correct : la règle "ip saddr 10.10.30.0/24 ip daddr 192.168.20.10 tcp dport 443 drop" précède la règle accept pour le même trafic — elle bloque tout le VLAN 30 sur le port 443.',
    remediation:
      'Correct : la correction minimale est de supprimer la règle drop erronée. La règle "accept" pour VLAN30 sur les ports {80, 443} est déjà présente et suffisante (moindre privilège).',
  };
  return messages[id] ?? 'Réponse correcte.';
}

function getFailureMessage(id, given) {
  const messages = {
    diagnostic_ordre:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Dans nftables, les règles sont évaluées séquentiellement. La PREMIÈRE règle qui correspond à un paquet détermine le verdict.`,
    diagnostic_regle:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Repérez dans FORWARD la ligne contenant "10.10.30.0/24" et "drop" pour le port 443 — elle apparaît AVANT la règle "accept" pour le même flux.`,
    remediation:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Il ne faut pas ajouter de règles mais supprimer la règle drop incorrecte. La règle accept existante suffit pour autoriser le VLAN 30.`,
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
  const verdict = validateScenarioPareFeu(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
