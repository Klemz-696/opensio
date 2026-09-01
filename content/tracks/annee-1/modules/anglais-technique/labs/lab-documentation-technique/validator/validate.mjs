#!/usr/bin/env node

/**
 * Validateur du lab "Analyse de Documentation Technique et Diagnostic Opérationnel en Anglais"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateTechnicalDiagnostic(workDir = '/work') {
  const filePath = join(workDir, 'diagnostic.json');

  const checks = [
    { id: 'json_structure_and_service', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'severity_and_cve_analysis', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'remediation_patch_and_hardening', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'validation_command_and_downtime', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier diagnostic.json introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  let data;
  try {
    const rawContent = readFileSync(filePath, 'utf-8');
    data = JSON.parse(rawContent);
  } catch (err) {
    checks[0].message = `Erreur de syntaxe JSON dans diagnostic.json : ${err.message}`;
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const analysis = data.incident_analysis || {};
  const remediation = data.remediation_plan || {};

  // 1. Structure JSON et identification du service (json_structure_and_service)
  const service = (analysis.service || '').toLowerCase();
  const hasService = service.includes('nginx') || service.includes('openssl') || service.includes('web') || service.includes('tls');

  if (!hasService) {
    checks[0].message = "Le service impacté (Nginx / OpenSSL Web Server) doit être identifié dans 'incident_analysis.service'.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure JSON valide et identification du service Nginx/OpenSSL validée.';
  }

  // 2. Évaluation de la sévérité et de la cause racine (severity_and_cve_analysis)
  const severity = (analysis.severity_level || '').toLowerCase();
  const rootCause = (analysis.root_cause || '').toLowerCase();

  const isSeverityValid = severity.includes('critical') || severity.includes('emerg') || severity.includes('9.8') || severity.includes('high');
  const isRootCauseValid =
    rootCause.includes('handshake') ||
    rootCause.includes('protocol') ||
    rootCause.includes('tls') ||
    rootCause.includes('cve') ||
    rootCause.includes('outdated') ||
    rootCause.includes('obsolète');

  if (!isSeverityValid) {
    checks[1].message = "Le niveau de sévérité doit être qualifié en 'Critical' ou 'Emergency' (CVSS 9.8).";
  } else if (!isRootCauseValid) {
    checks[1].message = "La cause racine doit expliquer l'échec de négociation TLS dû à la version OpenSSL vulnérable/obsolète.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Analyse de sévérité et diagnostic de la cause racine validés.';
  }

  // 3. Plan de remédiation : mise à jour et durcissement (remediation_patch_and_hardening)
  const action = (remediation.immediate_action || '').toLowerCase();
  const config = (remediation.configuration_change || '').toLowerCase();

  const hasUpgrade = action.includes('upgrade') || action.includes('update') || action.includes('patch') || action.includes('apt');
  const hasTlsHardening = config.includes('1.2') || config.includes('1.3') || config.includes('protocols') || config.includes('tls');

  if (!hasUpgrade) {
    checks[2].message = "L'action immédiate doit prévoir la mise à niveau de sécurité des paquets openssl/nginx.";
  } else if (!hasTlsHardening) {
    checks[2].message = "La configuration doit imposer les protocoles sécurisés (TLSv1.2 et TLSv1.3).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Plan de remédiation (mise à niveau et restriction TLS 1.2/1.3) conforme.';
  }

  // 4. Commande de vérification et temps d'arrêt (validation_command_and_downtime)
  const postCheck = (remediation.post_check_command || '').toLowerCase();
  const downtime = Number(remediation.estimated_downtime_minutes);

  const hasCommand = postCheck.includes('nginx -t') || postCheck.includes('reload') || postCheck.includes('systemctl') || postCheck.includes('openssl');
  const isDowntimeValid = downtime >= 0 && downtime <= 5;

  if (!hasCommand) {
    checks[3].message = "La commande de validation doit vérifier la syntaxe ('nginx -t') et recharger le service sans coupure ('systemctl reload nginx').";
  } else if (!isDowntimeValid) {
    checks[3].message = "Le temps d'arrêt estimé doit être <= 5 minutes pour un rechargement à chaud.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Commande de validation post-intervention et estimation de downtime validées.';
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateTechnicalDiagnostic(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
