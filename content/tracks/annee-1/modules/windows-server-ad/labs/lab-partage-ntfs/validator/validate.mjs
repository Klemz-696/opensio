#!/usr/bin/env node

/**
 * Validateur du lab "Sécurisation des partages SMB et permissions NTFS selon la méthode AGDLP"
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePartageNtfs(workDir = '/work') {
  const csvPath = join(workDir, 'plan.csv');

  const checks = [
    { id: 'shares_valid', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'ntfs_groups_agdlp_valid', passed: false, points: 0, maxPoints: 45, message: '' },
    { id: 'inheritance_policy_valid', passed: false, points: 0, maxPoints: 20, message: '' },
  ];

  if (!existsSync(csvPath)) {
    checks[0].message = 'Fichier plan.csv introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(csvPath, 'utf-8');
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    checks[0].message = 'Le fichier plan.csv est vide ou ne comporte pas de données.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const expectedShares = {
    'direction': {
      shareName: 'direction',
      rwPattern: /gdl_partage_direction_(m|rw|modif|modification)\b/,
      roPattern: /gdl_partage_direction_(l|ro|lecture)\b/,
      inheritanceDisabled: true,
    },
    'comptabilite': {
      shareName: 'comptabilite',
      rwPattern: /gdl_partage_compt?a?(bilite)?_(m|rw|modif|modification)\b/,
      roPattern: /gdl_partage_compt?a?(bilite)?_(l|ro|lecture)\b/,
      inheritanceDisabled: true,
    },
    'technique': {
      shareName: 'technique',
      rwPattern: /gdl_partage_technique_(m|rw|modif|modification)\b/,
      roPattern: /gdl_partage_technique_(l|ro|lecture)\b/,
      inheritanceDisabled: true,
    },
    'commun': {
      shareName: 'commun',
      rwPattern: /gdl_partage_commun_(m|rw|modif|modification)\b/,
      roPattern: /gdl_partage_commun_(l|ro|lecture)\b/,
      inheritanceDisabled: false,
    },
  };

  const parsedEntries = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 6) continue;

    const folderPath = cols[0];
    const key = folderPath.toLowerCase().replace(/.*[\\/]/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const shareName = cols[1];
    const sharePerm = cols[2].toLowerCase();
    const ntfsRw = cols[3].toLowerCase();
    const ntfsRo = cols[4].toLowerCase();
    const inheritanceDisabled = cols[5].toLowerCase() === 'true';

    parsedEntries.set(key, {
      folderPath,
      shareName,
      sharePerm,
      ntfsRw,
      ntfsRo,
      inheritanceDisabled,
    });
  }

  // 1. Vérification des partages SMB (shares_valid)
  let sharesValid = true;
  const shareErrors = [];

  for (const [key, rules] of Object.entries(expectedShares)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      sharesValid = false;
      shareErrors.push(`Dossier ${key} manquant.`);
      continue;
    }

    if (entry.shareName.toLowerCase() !== rules.shareName) {
      sharesValid = false;
      shareErrors.push(`${entry.folderPath} : nom de partage '${entry.shareName}' non conforme.`);
    }

    const validPerm = /modifier|change|controle total|full control/.test(entry.sharePerm);
    if (!validPerm) {
      sharesValid = false;
      shareErrors.push(`${entry.folderPath} : permission de partage '${entry.sharePerm}' insuffisante (attendu : Modifier).`);
    }
  }

  if (sharesValid && parsedEntries.size >= 4) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Partages SMB et permissions réseau (Modifier) correctement configurés.';
  } else {
    checks[0].message = shareErrors.join(' ');
  }

  // 2. Vérification des groupes GDL AGDLP (ntfs_groups_agdlp_valid)
  let agdlpValid = true;
  const agdlpErrors = [];

  for (const [key, rules] of Object.entries(expectedShares)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      agdlpValid = false;
      continue;
    }

    if (!rules.rwPattern.test(entry.ntfsRw)) {
      agdlpValid = false;
      agdlpErrors.push(`${entry.folderPath} : Groupe GDL Modification '${entry.ntfsRw}' non conforme à AGDLP.`);
    }
    if (!rules.roPattern.test(entry.ntfsRo)) {
      agdlpValid = false;
      agdlpErrors.push(`${entry.folderPath} : Groupe GDL Lecture '${entry.ntfsRo}' non conforme à AGDLP.`);
    }
  }

  if (agdlpValid && sharesValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Groupes de Domaine Local (GDL) de Modification et de Lecture rigoureusement conformes à AGDLP.';
  } else {
    checks[1].message = agdlpErrors.join(' ');
  }

  // 3. Vérification de la politique d'héritage (inheritance_policy_valid)
  let inheritanceValid = true;
  const inheritanceErrors = [];

  for (const [key, rules] of Object.entries(expectedShares)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      inheritanceValid = false;
      continue;
    }

    if (entry.inheritanceDisabled !== rules.inheritanceDisabled) {
      inheritanceValid = false;
      inheritanceErrors.push(
        `${entry.folderPath} : inheritance_disabled doit valoir ${rules.inheritanceDisabled} (reçu : ${entry.inheritanceDisabled}).`
      );
    }
  }

  if (inheritanceValid && sharesValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Politique d\'héritage NTFS (désactivation sur répertoires sensibles) respectée.';
  } else {
    checks[2].message = inheritanceErrors.join(' ');
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.filter((c) => c.id !== 'inheritance_policy_valid').every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validatePartageNtfs(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
