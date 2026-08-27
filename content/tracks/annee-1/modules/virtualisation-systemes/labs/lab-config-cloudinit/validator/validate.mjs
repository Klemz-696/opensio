#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement Automatisé d'une VM via Cloud-Init"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateCloudInit(workDir = '/work') {
  const filePath = join(workDir, 'user-data');

  const checks = [
    { id: 'header_and_syntax', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'users_and_security', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'packages_installed', passed: false, points: 0, maxPoints: 20, message: '' },
    { id: 'runcmd_and_hardening', passed: false, points: 0, maxPoints: 20, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier user-data introuvable dans le répertoire de travail.';
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

  // 1. Contrôle de l'en-tête #cloud-config et de la structure générale (header_and_syntax)
  const firstNonEmptyLine = lines.find((l) => l.trim().length > 0);
  if (!firstNonEmptyLine || firstNonEmptyLine.trim() !== '#cloud-config') {
    checks[0].message = "La première ligne du fichier user-data doit obligatoirement être l'en-tête '#cloud-config'.";
  } else {
    const hasHostname = lines.some((l) => /^\s*hostname\s*:\s*srv-web-prod\s*$/i.test(l));
    const hasFqdn = lines.some((l) => /^\s*fqdn\s*:\s*srv-web-prod\.societe\.lan\s*$/i.test(l));

    if (!hasHostname) {
      checks[0].message = "Directive attendue : 'hostname: srv-web-prod'.";
    } else if (!hasFqdn) {
      checks[0].message = "Directive attendue : 'fqdn: srv-web-prod.societe.lan'.";
    } else {
      checks[0].passed = true;
      checks[0].points = checks[0].maxPoints;
      checks[0].message = "En-tête #cloud-config et nom d'hôte/FQDN parfaitement déclarés.";
    }
  }

  // 2. Contrôle de l'utilisateur admin et de la clé SSH (users_and_security)
  const hasAdminUser = lines.some((l) => /^\s*-\s*name\s*:\s*admin-sys\s*$/i.test(l) || /^\s*name\s*:\s*admin-sys\s*$/i.test(l));
  const hasSudo = lines.some((l) => /sudo\s*:\s*.*ALL=\(ALL\).*NOPASSWD:ALL/i.test(l) || /sudo\s*:\s*\[.*NOPASSWD.*\]/i.test(l));
  const hasShell = lines.some((l) => /shell\s*:\s*\/bin\/bash/i.test(l));
  const hasSshKey = lines.some((l) => /ssh-(ed25519|rsa)\s+[A-Za-z0-9+/=]+/i.test(l));

  if (!hasAdminUser) {
    checks[1].message = "Utilisateur 'admin-sys' manquant dans la section 'users:'.";
  } else if (!hasSudo) {
    checks[1].message = "La directive sudo de 'admin-sys' doit autoriser 'ALL=(ALL) NOPASSWD:ALL'.";
  } else if (!hasShell) {
    checks[1].message = "Le shell de l'utilisateur 'admin-sys' doit être '/bin/bash'.";
  } else if (!hasSshKey) {
    checks[1].message = "Clé SSH publique autorisée manquante dans 'ssh_authorized_keys:'.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Compte d'administration 'admin-sys' et clé SSH configurés avec succès.";
  }

  // 3. Contrôle des paquets indispensables (packages_installed)
  const requiredPackages = ['qemu-guest-agent', 'curl', 'htop', 'ufw', 'git'];
  const missingPackages = requiredPackages.filter(
    (pkg) => !lines.some((l) => new RegExp(`^\\s*-\\s*${pkg}\\s*$`, 'i').test(l) || new RegExp(`packages:.*${pkg}`, 'i').test(l))
  );

  if (missingPackages.length > 0) {
    checks[2].message = `Paquets indispensables manquants dans 'packages:' : ${missingPackages.join(', ')}.`;
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Tous les paquets nécessaires (agent QEMU, pare-feu UFW, utilitaires) sont déclarés.';
  }

  // 4. Contrôle des commandes runcmd et durcissement (runcmd_and_hardening)
  const hasAgentEnable = lines.some((l) => /qemu-guest-agent/i.test(l) && (/enable/i.test(l) || /start/i.test(l)));
  const hasUfwDeny = lines.some((l) => /ufw\s+default\s+deny\s+incoming/i.test(l));
  const hasUfwSsh = lines.some((l) => /ufw\s+allow\s+(22|22\/tcp|ssh)/i.test(l));
  const hasUfwEnable = lines.some((l) => /ufw\s+.*enable/i.test(l));

  if (!hasAgentEnable) {
    checks[3].message = "L'activation de l'agent QEMU ('systemctl enable --now qemu-guest-agent') est requise dans 'runcmd:'.";
  } else if (!hasUfwDeny || !hasUfwSsh || !hasUfwEnable) {
    checks[3].message = "Configuration du pare-feu UFW incomplète dans 'runcmd:' (règles par défaut, autorisation SSH 22, activation).";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Commandes d'initialisation et durcissement du pare-feu parfaitement ordonnancées dans 'runcmd:'.";
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
  const verdict = validateCloudInit(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
