#!/usr/bin/env node

/**
 * Validateur du scénario S1 — DHCP indisponible
 * Lit answers.json dans workDir et évalue les 3 étapes de diagnostic/remédiation.
 * Conforme au contrat OpenSIO (§26.3).
 *
 * Format attendu de answers.json :
 * {
 *   "steps": [
 *     { "id": "diagnostic_cause", "answer": "b" },
 *     { "id": "diagnostic_service", "answer": "c" },
 *     { "id": "remediation", "answer": "a" }
 *   ]
 * }
 *
 * Réponses correctes :
 *   diagnostic_cause    → "b"  (le serveur DHCP ne répond pas → APIPA)
 *   diagnostic_service  → "c"  (erreur de config : option routers hors sous-réseau)
 *   remediation         → "a"  (corriger l'option routers dans dhcpd.conf)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CORRECT_ANSWERS = {
  diagnostic_cause: 'b',
  diagnostic_service: 'c',
  remediation: 'a',
};

const CHECK_POINTS = {
  diagnostic_cause: 30,
  diagnostic_service: 30,
  remediation: 40,
};

export function validateScenarioDhcp(workDir = '/work') {
  const answersPath = join(workDir, 'answers.json');

  const checks = [
    { id: 'diagnostic_cause', passed: false, points: 0, message: '' },
    { id: 'diagnostic_service', passed: false, points: 0, message: '' },
    { id: 'remediation', passed: false, points: 0, message: '' },
  ];

  if (!existsSync(answersPath)) {
    checks[0].message = 'Aucune réponse soumise (answers.json introuvable).';
    checks[1].message = 'Aucune réponse soumise.';
    checks[2].message = 'Aucune réponse soumise.';
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

  // Évaluation de chaque étape
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
    diagnostic_cause:
      'Correct : une adresse APIPA (169.254.x.x) confirme que le client n\'a reçu aucune réponse du serveur DHCP.',
    diagnostic_service:
      'Correct : le log révèle que l\'option routers (192.168.99.1) n\'appartient pas au sous-réseau 192.168.10.0/24 — le service refuse de démarrer.',
    remediation:
      'Correct : corriger l\'option routers dans dhcpd.conf pour utiliser une adresse du sous-réseau (ex. 192.168.10.254) puis relancer isc-dhcp-server.',
  };
  return messages[id] ?? 'Réponse correcte.';
}

function getFailureMessage(id, given) {
  const messages = {
    diagnostic_cause:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Une adresse APIPA signifie l\'absence de bail DHCP, non un conflit d\'adresses IP.`,
    diagnostic_service:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). Relisez la ligne de log : "Option routers is not in subnet" — c\'est une erreur de configuration, pas un problème réseau.`,
    remediation:
      `Incorrect (réponse : "${given ?? 'non fournie'}"). La passerelle déclarée dans option routers doit appartenir au sous-réseau configuré dans la directive subnet.`,
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
  const verdict = validateScenarioDhcp(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
