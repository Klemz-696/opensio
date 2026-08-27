#!/usr/bin/env node

/**
 * Validateur du lab "Rédaction Professionnelle d'un Ticket de Support en Anglais"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateSupportTicket(workDir = '/work') {
  const filePath = join(workDir, 'ticket.md');

  const checks = [
    { id: 'ticket_structure_and_priority', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'symptoms_and_impact_english', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'troubleshooting_and_workaround', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'action_requested_clarity', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier ticket.md introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(filePath, 'utf-8');
  const lower = rawContent.toLowerCase();

  // 1. Structure Markdown et niveau de priorité (ticket_structure_and_priority)
  const hasSummary = /##\s*summary/i.test(rawContent);
  const hasPriority = /##\s*priority/i.test(rawContent);
  const hasSymptoms = /##\s*symptoms/i.test(rawContent);
  const hasTroubleshooting = /##\s*troubleshooting/i.test(rawContent);
  const hasAction = /##\s*action/i.test(rawContent);
  const isP1 = lower.includes('p1') || lower.includes('critical');

  if (!hasSummary || !hasPriority || !hasSymptoms || !hasTroubleshooting || !hasAction) {
    checks[0].message = 'Les sections requises (## Summary, ## Priority, ## Symptoms, ## Troubleshooting, ## Action Requested) sont incomplètes.';
  } else if (!isP1) {
    checks[0].message = "La priorité du ticket doit être qualifiée en 'P1 - Critical' compte tenu du blocage de l'ERP.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure Markdown et priorité P1 Critical conformes aux standards de support IT.';
  }

  // 2. Description des symptômes et de l'impact en anglais (symptoms_and_impact_english)
  const hasSystem = lower.includes('db-prod-01') || lower.includes('postgresql') || lower.includes('database');
  const hasErp = lower.includes('erp');
  const hasImpact = lower.includes('150') || lower.includes('users') || lower.includes('outage') || lower.includes('down');
  const isEnglish = (lower.includes('the') || lower.includes('is') || lower.includes('due to')) && !lower.includes('le serveur est en panne');

  if (!hasSystem) {
    checks[1].message = "Le serveur ou service affecté (db-prod-01 / PostgreSQL) doit être clairement identifié.";
  } else if (!hasErp || !hasImpact) {
    checks[1].message = "L'impact métier (ERP inaccessible, 150 utilisateurs bloqués) doit être mentionné.";
  } else if (!isEnglish) {
    checks[1].message = "Le ticket doit être rédigé en anglais technique professionnel.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Symptômes et impact métier documentés avec précision en anglais.';
  }

  // 3. Diagnostic technique et solution de contournement (troubleshooting_and_workaround)
  const hasDiskFull = lower.includes('100%') || lower.includes('full') || lower.includes('no space left') || lower.includes('partition');
  const hasWorkaround = lower.includes('workaround') || lower.includes('freed') || lower.includes('purged') || lower.includes('2 gb') || lower.includes('2gb') || lower.includes('temporary');

  if (!hasDiskFull) {
    checks[2].message = "Le diagnostic technique (saturation disque à 100% / No space left on device) doit être consigné.";
  } else if (!hasWorkaround) {
    checks[2].message = "La solution de contournement temporaire appliquée (purge de 2 Go de logs) doit être expliquée.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Diagnostic technique et contournement d’urgence validés.';
  }

  // 4. Demande d'action claire pour le N2 (action_requested_clarity)
  const hasActionRequest = (lower.includes('expand') || lower.includes('extend') || lower.includes('increase') || lower.includes('provision')) && (lower.includes('50') || lower.includes('gb') || lower.includes('partition') || lower.includes('storage'));

  if (!hasActionRequest) {
    checks[3].message = "La demande d'escalade doit formuler clairement l'extension de la partition disque (ex: 'Expand disk partition by 50 GB').";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Demande d'action finale claire et actionnable pour l'équipe d'ingénierie N2.";
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
  const verdict = validateSupportTicket(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
