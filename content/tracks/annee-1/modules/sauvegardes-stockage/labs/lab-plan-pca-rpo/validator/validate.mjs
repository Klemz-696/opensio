#!/usr/bin/env node

/**
 * Validateur du lab "Élaboration d'une Matrice PCA/PRA et Politiques RTO/RPO"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePcaPlan(workDir = '/work') {
  const filePath = join(workDir, 'plan-continuite.csv');

  const checks = [
    { id: 'services_presence_and_structure', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'rpo_targets_valid', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'rto_targets_valid', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'backup_strategy_and_tests', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier plan-continuite.csv introuvable dans le répertoire de travail.';
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
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 5) {
    checks[0].message = 'Le fichier plan-continuite.csv doit comporter un en-tête et au moins 4 services déclarés.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 6) continue;
    entries.push({
      service: cols[0].toLowerCase(),
      criticite: cols[1].toLowerCase(),
      rpo: cols[2].toLowerCase(),
      rto: cols[3].toLowerCase(),
      strategie: cols[4].toLowerCase(),
      test: cols[5].toLowerCase(),
    });
  }

  // 1. Contrôle de la présence des 4 services (services_presence_and_structure)
  const findService = (keyword) => entries.find((e) => e.service.includes(keyword));
  const adService = findService('active directory') || findService('ad');
  const erpService = findService('erp') || findService('postgres') || findService('bdd');
  const fileService = findService('fichier') || findService('partage');
  const logService = findService('log') || findService('archiv');

  if (!adService || !erpService || !fileService || !logService) {
    const missing = [];
    if (!adService) missing.push('Active Directory DS');
    if (!erpService) missing.push('ERP PostgreSQL');
    if (!fileService) missing.push('Serveur de Fichiers');
    if (!logService) missing.push('Serveur de Logs');
    checks[0].message = `Services manquants dans la matrice : ${missing.join(', ')}.`;
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure CSV et identification des 4 services critiques validées.';
  }

  if (adService && erpService && fileService && logService) {
    // 2. Contrôle des RPO cibles (rpo_targets_valid)
    const isErpRpoValid = erpService.rpo.includes('15') || erpService.rpo.includes('15min') || erpService.rpo.includes('15 min');
    const isAdRpoValid = adService.rpo.includes('1h') || adService.rpo.includes('1 h') || adService.rpo.includes('30') || adService.rpo.includes('0');
    const isFileRpoValid = fileService.rpo.includes('24') || fileService.rpo.includes('24h') || fileService.rpo.includes('1j') || fileService.rpo.includes('jour');
    const isLogRpoValid = logService.rpo.includes('7') || logService.rpo.includes('semaine') || logService.rpo.includes('24');

    if (!isErpRpoValid) {
      checks[1].message = "Le RPO de l'ERP doit être <= 15 minutes (archivage continu des transactions).";
    } else if (!isAdRpoValid) {
      checks[1].message = "Le RPO de l'Active Directory doit être <= 1 heure.";
    } else if (!isFileRpoValid) {
      checks[1].message = 'Le RPO du serveur de fichiers doit être <= 24 heures.';
    } else {
      checks[1].passed = true;
      checks[1].points = checks[1].maxPoints;
      checks[1].message = 'Objectifs de perte maximale de données (RPO) parfaitement calibrés selon la criticité.';
    }

    // 3. Contrôle des RTO cibles (rto_targets_valid)
    const isAdRtoValid = adService.rto.includes('30') || adService.rto.includes('30min') || adService.rto.includes('15');
    const isErpRtoValid = erpService.rto.includes('1h') || erpService.rto.includes('1 h') || erpService.rto.includes('2h');
    const isFileRtoValid = fileService.rto.includes('4h') || fileService.rto.includes('4 h') || fileService.rto.includes('2h');
    const isLogRtoValid = logService.rto.includes('48') || logService.rto.includes('48h') || logService.rto.includes('24');

    if (!isAdRtoValid) {
      checks[2].message = "Le RTO de l'Active Directory doit être <= 30 minutes (service d'authentification central).";
    } else if (!isErpRtoValid) {
      checks[2].message = "Le RTO de l'ERP doit être <= 1 heure.";
    } else if (!isFileRtoValid) {
      checks[2].message = 'Le RTO du serveur de fichiers doit être <= 4 heures.';
    } else {
      checks[2].passed = true;
      checks[2].points = checks[2].maxPoints;
      checks[2].message = 'Objectifs de temps de rétablissement (RTO) réalistes et conformes aux exigences PCA/PRA.';
    }

    // 4. Contrôle des stratégies de sauvegarde et fréquences de tests (backup_strategy_and_tests)
    const isAdStrategyValid = adService.strategie.includes('system state') || adService.strategie.includes('snapshot') || adService.strategie.includes('immuable');
    const isErpStrategyValid = erpService.strategie.includes('wal') || erpService.strategie.includes('dump') || erpService.strategie.includes('continu');
    const isFileStrategyValid = fileService.strategie.includes('rsync') || fileService.strategie.includes('borg') || fileService.strategie.includes('gfs') || fileService.strategie.includes('incrémentale');
    const isAdTestValid = adService.test.includes('hebdo') || adService.test.includes('mensuel');
    const isErpTestValid = erpService.test.includes('hebdo') || erpService.test.includes('mensuel');

    if (!isAdStrategyValid || !isErpStrategyValid || !isFileStrategyValid) {
      checks[3].message = 'Les stratégies techniques associées doivent correspondre aux technologies requises (System State/Snapshot, WAL/Dump, rsync/Borg).';
    } else if (!isAdTestValid || !isErpTestValid) {
      checks[3].message = 'Les services critiques (AD DS, ERP) doivent faire l’objet de tests de restauration hebdomadaires ou mensuels.';
    } else {
      checks[3].passed = true;
      checks[3].points = checks[3].maxPoints;
      checks[3].message = 'Stratégies techniques de sauvegarde et calendrier des tests de restauration conformes ISO 27001.';
    }
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
  const verdict = validatePcaPlan(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
