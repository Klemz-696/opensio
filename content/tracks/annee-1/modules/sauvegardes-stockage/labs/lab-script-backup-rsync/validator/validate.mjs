#!/usr/bin/env node

/**
 * Validateur du lab "Script de Sauvegarde Automatisée avec rsync et Contrôle SHA-256"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateBackupScript(workDir = '/work') {
  const filePath = join(workDir, 'backup.sh');

  const checks = [
    { id: 'bash_header_and_safety', passed: false, points: 0, maxPoints: 20, message: '' },
    { id: 'rsync_options_and_sync', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'sha256_integrity_check', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'rotation_and_logging', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier backup.sh introuvable dans le répertoire de travail.';
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
  const lines = rawContent.split(/\r?\n/);

  // 1. Contrôle du shebang et de la sécurité Bash (bash_header_and_safety)
  const firstLine = lines[0] ? lines[0].trim() : '';
  const hasShebang = firstLine.startsWith('#!/bin/bash') || firstLine.startsWith('#!/usr/bin/env bash');
  const hasStrictMode = lines.some((l) => /^\s*set\s+-(e|euo\s+pipefail|eu|o\s+pipefail)/.test(l));

  if (!hasShebang) {
    checks[0].message = "Le script doit débuter par le shebang '#!/bin/bash' ou '#!/usr/bin/env bash'.";
  } else if (!hasStrictMode) {
    checks[0].message = "Activation du mode strict Bash requise (ex: 'set -euo pipefail' ou 'set -e').";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'En-tête shebang et mode strict Bash conformes.';
  }

  // 2. Contrôle de la commande rsync et de ses options (rsync_options_and_sync)
  const hasRsync = lines.some((l) => /\brsync\b/.test(l));
  const hasArchive = lines.some((l) => /\brsync\b.*(-[a-z]*a|--archive)/.test(l));
  const hasDelete = lines.some((l) => /\brsync\b.*--delete/.test(l));
  const hasExclude = lines.some((l) => /--exclude/.test(l));

  if (!hasRsync) {
    checks[1].message = "La commande 'rsync' est absente du script.";
  } else if (!hasArchive) {
    checks[1].message = "L'option d'archivage (-a / --archive) est obligatoire sur rsync pour préserver les permissions.";
  } else if (!hasDelete) {
    checks[1].message = "L'option '--delete' est requise pour maintenir une stricte synchronisation miroir.";
  } else if (!hasExclude) {
    checks[1].message = "L'exclusion de fichiers temporaires ('--exclude=...') est requise.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Commande rsync configurée avec archivage (-a), suppression (--delete) et exclusions.';
  }

  // 3. Contrôle du calcul d'empreinte SHA-256 (sha256_integrity_check)
  const hasSha256 = lines.some((l) => /\bsha256sum\b/.test(l));
  const hasChecksumFile = lines.some((l) => /checksums\.sha256|\.sha256/i.test(l));

  if (!hasSha256) {
    checks[2].message = "La commande 'sha256sum' est requise pour générer l'empreinte de contrôle d'intégrité.";
  } else if (!hasChecksumFile) {
    checks[2].message = "L'empreinte calculée doit être enregistrée dans un fichier de contrôle (ex: checksums.sha256).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = "Calcul d'intégrité cryptographique SHA-256 et écriture du fichier de contrôle validés.";
  }

  // 4. Contrôle de la rotation et des logs (rotation_and_logging)
  const hasRotation = lines.some((l) => /\bfind\b/.test(l) && (/-mtime|-delete|-exec\s+rm/.test(l) || /RETENTION/i.test(l)));
  const hasLogging = lines.some((l) => /LOG_FILE|backup\.log|logger|\.log\b/i.test(l));

  if (!hasRotation) {
    checks[3].message = "La politique de rotation des anciennes sauvegardes via la commande 'find' (-mtime / -delete) est manquante.";
  } else if (!hasLogging) {
    checks[3].message = "La journalisation des opérations dans un fichier de logs (backup.log) est requise.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Rotation automatique par rétention et traçabilité dans les logs configurées.";
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
  const verdict = validateBackupScript(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
