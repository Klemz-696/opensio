#!/usr/bin/env node

/**
 * Validateur du lab "Mise en Place d'une Stratégie de Patch Management et Mises à Jour de Sécurité Automatisées"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePatchManagementConfig(workDir = '/work') {
  const configPath = join(workDir, '50unattended-upgrades');
  const periodicPath = join(workDir, '02periodic');

  const checks = [
    { id: 'security_repositories_and_blacklist', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'reboot_and_cleanup_policy', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'periodic_update_and_download', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'periodic_upgrade_and_autoclean', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(configPath) || !existsSync(periodicPath)) {
    checks[0].message = 'Fichiers 50unattended-upgrades ou 02periodic introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const configContent = readFileSync(configPath, 'utf-8');
  const periodicContent = readFileSync(periodicPath, 'utf-8');

  // 1. Dépôts autorisés et liste noire (security_repositories_and_blacklist)
  const hasSecurityOrigin = /Allowed-Origins[\s\S]*?-security/i.test(configContent);
  const hasPackageBlacklist = /Package-Blacklist[\s\S]*?(mysql|nginx|mariadb|apache)/i.test(configContent);

  if (!hasSecurityOrigin) {
    checks[0].message = "Les origines autorisées 'Allowed-Origins' doivent cibler la suite '-security'.";
  } else if (!hasPackageBlacklist) {
    checks[0].message = "La directive 'Package-Blacklist' doit exclure des services critiques (ex: mysql-server ou nginx).";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Restriction des dépôts de sécurité et liste noire de paquets validées.';
  }

  // 2. Politique de redémarrage et nettoyage (reboot_and_cleanup_policy)
  const hasAutoReboot = /Automatic-Reboot\s*"(true|1)"/i.test(configContent);
  const hasRebootTime = /Automatic-Reboot-Time\s*"0[0-6]:[0-5][0-9]"/i.test(configContent);
  const hasRemoveUnused = /Remove-Unused-Dependencies\s*"(true|1)"/i.test(configContent);

  if (!hasAutoReboot) {
    checks[1].message = "L'activation du redémarrage automatique 'Automatic-Reboot \"true\"' est requise.";
  } else if (!hasRebootTime) {
    checks[1].message = "L'heure de redémarrage nocturne 'Automatic-Reboot-Time \"03:30\"' doit être configurée en fenêtre creuse.";
  } else if (!hasRemoveUnused) {
    checks[1].message = "La suppression des paquets orphelins 'Remove-Unused-Dependencies \"true\"' est requise.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Fenêtrage nocturne de redémarrage et nettoyage des dépendances validés.';
  }

  // 3. Périodicité de mise à jour et pré-téléchargement (periodic_update_and_download)
  const hasUpdateLists = /APT::Periodic::Update-Package-Lists\s*"1"/i.test(periodicContent);
  const hasDownloadPackages = /APT::Periodic::Download-Upgradeable-Packages\s*"1"/i.test(periodicContent);

  if (!hasUpdateLists) {
    checks[2].message = "La directive 'APT::Periodic::Update-Package-Lists \"1\";' est requise dans 02periodic.";
  } else if (!hasDownloadPackages) {
    checks[2].message = "La directive 'APT::Periodic::Download-Upgradeable-Packages \"1\";' est requise.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Mise à jour quotidienne des index et téléchargement des correctifs validés.';
  }

  // 4. Exécution automatique et nettoyage du cache (periodic_upgrade_and_autoclean)
  const hasUnattendedUpgrade = /APT::Periodic::Unattended-Upgrade\s*"1"/i.test(periodicContent);
  const hasAutoclean = /APT::Periodic::AutocleanInterval\s*"[1-7]"/i.test(periodicContent);

  if (!hasUnattendedUpgrade) {
    checks[3].message = "L'exécution quotidienne 'APT::Periodic::Unattended-Upgrade \"1\";' doit être activée.";
  } else if (!hasAutoclean) {
    checks[3].message = "Le nettoyage régulier du cache 'APT::Periodic::AutocleanInterval' (ex: \"7\") est requis.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Déclenchement automatique des mises à jour et nettoyage périodique validés.';
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
  const verdict = validatePatchManagementConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
