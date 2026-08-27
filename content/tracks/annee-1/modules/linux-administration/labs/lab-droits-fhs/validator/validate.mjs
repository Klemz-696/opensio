#!/usr/bin/env node

/**
 * Validateur du lab "Sécurisation de l'arborescence FHS et matrice des permissions UNIX"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePermissions(workDir = '/work') {
  const csvPath = join(workDir, 'permissions.csv');

  const checks = [
    { id: 'ownership_valid', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'standard_permissions_valid', passed: false, points: 0, maxPoints: 40, message: '' },
    { id: 'special_bits_valid', passed: false, points: 0, maxPoints: 30, message: '' },
  ];

  if (!existsSync(csvPath)) {
    checks[0].message = 'Fichier permissions.csv introuvable dans le répertoire de travail.';
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
    checks[0].message = 'Le fichier permissions.csv est vide ou ne comporte pas de données.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const expectedPaths = {
    '/var/www/html': { owner: 'www-data', group: 'www-data', mode: '755' },
    '/data/partages/comptabilite': { owner: 'root', group: 'compta', mode: '2770' },
    '/data/partages/technique': { owner: 'root', group: 'technique', mode: '2770' },
    '/data/partages/commun': { owner: 'root', group: 'users', mode: '1777' },
    '/etc/ssl/private': { owner: 'root', group: 'ssl-cert', mode: '710' },
  };

  const parsedEntries = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 4) continue;

    const path = cols[0];
    const owner = cols[1].toLowerCase();
    const group = cols[2].toLowerCase();
    const mode = cols[3];

    parsedEntries.set(path, { owner, group, mode });
  }

  // 1. Contrôle des propriétaires et groupes (ownership_valid)
  let ownershipValid = true;
  const ownershipErrors = [];

  for (const [path, expected] of Object.entries(expectedPaths)) {
    const entry = parsedEntries.get(path);
    if (!entry) {
      ownershipValid = false;
      ownershipErrors.push(`Chemin manquant : ${path}.`);
      continue;
    }

    if (entry.owner !== expected.owner || entry.group !== expected.group) {
      ownershipValid = false;
      ownershipErrors.push(
        `${path} : propriétaire/groupe attendu ${expected.owner}:${expected.group} (reçu : ${entry.owner}:${entry.group}).`
      );
    }
  }

  if (ownershipValid) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Tous les propriétaires et groupes de service sont rigoureusement configurés.';
  } else {
    checks[0].message = ownershipErrors.join(' ');
  }

  // 2. Contrôle des permissions standards (standard_permissions_valid)
  let standardValid = true;
  const standardErrors = [];

  for (const [path, expected] of Object.entries(expectedPaths)) {
    const entry = parsedEntries.get(path);
    if (!entry) {
      standardValid = false;
      continue;
    }

    // Normaliser les modes (ex: 0755 -> 755, 2770 -> 2770)
    const rawMode = entry.mode.replace(/^0+/, '');
    const expectedNormalized = expected.mode.replace(/^0+/, '');

    // Vérifier les 3 derniers chiffres (droits standard UGO)
    const entryUgo = rawMode.slice(-3);
    const expectedUgo = expectedNormalized.slice(-3);

    if (entryUgo !== expectedUgo) {
      standardValid = false;
      standardErrors.push(`${path} : droits UGO attendus ${expectedUgo} (reçu : ${entryUgo}).`);
    }
  }

  if (standardValid && ownershipValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Permissions octales standard (lecture, écriture, traversée) parfaitement adaptées.';
  } else {
    checks[1].message = standardErrors.join(' ');
  }

  // 3. Contrôle des bits spéciaux SGID et Sticky Bit (special_bits_valid)
  let specialValid = true;
  const specialErrors = [];

  for (const [path, expected] of Object.entries(expectedPaths)) {
    const entry = parsedEntries.get(path);
    if (!entry) {
      specialValid = false;
      continue;
    }

    const rawMode = entry.mode.padStart(4, '0');
    const expectedMode = expected.mode.padStart(4, '0');

    const specialBit = rawMode[0];
    const expectedSpecialBit = expectedMode[0];

    if (specialBit !== expectedSpecialBit) {
      specialValid = false;
      const typeBit = expectedSpecialBit === '2' ? 'SGID (2xxx)' : expectedSpecialBit === '1' ? 'Sticky Bit (1xxx)' : 'Aucun bit spécial (0xxx)';
      specialErrors.push(`${path} : bit spécial attendu ${typeBit} (reçu : ${specialBit}xxx).`);
    }
  }

  if (specialValid && ownershipValid && standardValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Bits spéciaux SGID (2770) et Sticky Bit (1777) appliqués avec succès.';
  } else {
    checks[2].message = specialErrors.join(' ');
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
  const verdict = validatePermissions(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
