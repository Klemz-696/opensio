#!/usr/bin/env node

/**
 * Validateur du lab "Configuration du stockage LVM et sécurisation des points de montage fstab"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateFstab(workDir = '/work') {
  const fstabPath = join(workDir, 'fstab');

  const checks = [
    { id: 'mountpoints_and_types_valid', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'uuids_declared', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'security_options_and_fsck_valid', passed: false, points: 0, maxPoints: 35, message: '' },
  ];

  if (!existsSync(fstabPath)) {
    checks[0].message = 'Fichier fstab introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(fstabPath, 'utf-8');
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 5) {
    checks[0].message = `Nombre de points de montage insuffisant dans fstab (reçu : ${lines.length}, attendu : 6).`;
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const expectedEntries = {
    '/': {
      uuid: '11111111-2222-3333-4444-555555555555',
      type: 'ext4',
      requiredOpts: ['defaults'],
      fsck: 1,
    },
    '/boot': {
      uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      type: 'ext4',
      requiredOpts: ['defaults'],
      fsck: 2,
    },
    '/var/www': {
      uuid: '22222222-3333-4444-5555-666666666666',
      type: 'ext4',
      requiredOpts: ['nodev', 'nosuid'],
      fsck: 2,
    },
    '/tmp': {
      uuid: '33333333-4444-5555-6666-777777777777',
      type: 'ext4',
      requiredOpts: ['nodev', 'nosuid', 'noexec'],
      fsck: 2,
    },
    '/var/lib/postgresql': {
      uuid: '44444444-5555-6666-7777-888888888888',
      type: 'xfs',
      requiredOpts: ['nodev'],
      fsck: 2,
    },
    'swap': {
      uuid: '99999999-8888-7777-6666-555555555555',
      type: 'swap',
      requiredOpts: ['sw'],
      fsck: 0,
    },
  };

  const parsedEntries = new Map();

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;

    const device = parts[0];
    const mountPoint = parts[1];
    const fsType = parts[2].toLowerCase();
    const options = parts[3].split(',').map((o) => o.trim().toLowerCase());
    const dump = parseInt(parts[4] || '0', 10);
    const pass = parseInt(parts[5] || '0', 10);

    const key = fsType === 'swap' || mountPoint === 'none' || mountPoint === 'swap' ? 'swap' : mountPoint;

    parsedEntries.set(key, {
      device,
      mountPoint,
      fsType,
      options,
      dump,
      pass,
    });
  }

  // 1. Contrôle des points de montage et types de système de fichiers (mountpoints_and_types_valid)
  let mountPointsValid = true;
  const mountErrors = [];

  for (const [key, expected] of Object.entries(expectedEntries)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      mountPointsValid = false;
      mountErrors.push(`Point de montage manquant : ${key}.`);
      continue;
    }

    if (entry.fsType !== expected.type) {
      mountPointsValid = false;
      mountErrors.push(`${key} : type de système de fichiers attendu ${expected.type} (reçu : ${entry.fsType}).`);
    }
  }

  if (mountPointsValid) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Tous les points de montage (racine, boot, /var/www, /tmp, PostgreSQL, swap) et types (ext4, xfs, swap) sont conformes.';
  } else {
    checks[0].message = mountErrors.join(' ');
  }

  // 2. Contrôle de l'utilisation des UUIDs (uuids_declared)
  let uuidValid = true;
  const uuidErrors = [];

  for (const [key, expected] of Object.entries(expectedEntries)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      uuidValid = false;
      continue;
    }

    const uuidMatch = entry.device.match(/^UUID=([a-f0-9-]+)$/i);
    if (!uuidMatch) {
      uuidValid = false;
      uuidErrors.push(`${key} : doit utiliser la syntaxe 'UUID=<id>' (reçu : ${entry.device}).`);
    } else if (uuidMatch[1].toLowerCase() !== expected.uuid.toLowerCase()) {
      uuidValid = false;
      uuidErrors.push(`${key} : UUID attendu ${expected.uuid} (reçu : ${uuidMatch[1]}).`);
    }
  }

  if (uuidValid && mountPointsValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Tous les volumes sont identifiés par leurs identifiants UUID persistants.';
  } else {
    checks[1].message = uuidErrors.join(' ');
  }

  // 3. Contrôle des options de sécurité et de l'ordre fsck (security_options_and_fsck_valid)
  let securityValid = true;
  const secErrors = [];

  for (const [key, expected] of Object.entries(expectedEntries)) {
    const entry = parsedEntries.get(key);
    if (!entry) {
      securityValid = false;
      continue;
    }

    // Vérifier fsck pass
    if (entry.pass !== expected.fsck) {
      securityValid = false;
      secErrors.push(`${key} : ordre fsck (pass) attendu ${expected.fsck} (reçu : ${entry.pass}).`);
    }

    // Vérifier options requises
    for (const opt of expected.requiredOpts) {
      if (!entry.options.includes(opt)) {
        securityValid = false;
        secErrors.push(`${key} : option de sécurité manquante '${opt}'.`);
      }
    }
  }

  if (securityValid && mountPointsValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Options de durcissement (nodev, nosuid, noexec sur /tmp et /var/www) et passes fsck (1 pour /, 2 pour les autres, 0 pour swap) validées.';
  } else {
    checks[2].message = secErrors.join(' ');
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
  const verdict = validateFstab(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
