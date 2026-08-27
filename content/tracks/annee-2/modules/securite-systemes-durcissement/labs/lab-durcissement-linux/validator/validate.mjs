#!/usr/bin/env node

/**
 * Validateur du lab "Durcissement Automatisé d'un Serveur Linux avec Ansible et Sysctl"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateHardeningConfig(workDir = '/work') {
  const playbookPath = join(workDir, 'hardening-playbook.yml');
  const sysctlPath = join(workDir, 'sysctl-security.conf');

  const checks = [
    { id: 'ssh_hardening_playbook_tasks', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'security_services_installation', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sysctl_network_protection', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sysctl_kernel_memory_protection', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(playbookPath) || !existsSync(sysctlPath)) {
    checks[0].message = 'Fichiers hardening-playbook.yml ou sysctl-security.conf introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const playbookContent = readFileSync(playbookPath, 'utf-8');
  const sysctlContent = readFileSync(sysctlPath, 'utf-8');

  // 1. Tâches SSH du Playbook (ssh_hardening_playbook_tasks)
  const hasPermitRoot = /PermitRootLogin\s+no/i.test(playbookContent);
  const hasPasswordAuth = /PasswordAuthentication\s+no/i.test(playbookContent);
  const hasPubkeyAuth = /PubkeyAuthentication\s+yes/i.test(playbookContent);
  const hasSshHandler = /handlers:[\s\S]*?name:\s*.*(ssh|sshd)/i.test(playbookContent);
  const hasNotify = /notify:\s*.*(ssh|sshd)/i.test(playbookContent);

  if (!hasPermitRoot || !hasPasswordAuth || !hasPubkeyAuth) {
    checks[0].message = "Le playbook doit configurer SSH avec 'PermitRootLogin no', 'PasswordAuthentication no' et 'PubkeyAuthentication yes'.";
  } else if (!hasSshHandler || !hasNotify) {
    checks[0].message = "Le playbook doit notifier un handler de rechargement du service SSH.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Configuration stricte de SSH et handler de rechargement validés.';
  }

  // 2. Installation et activation des services (security_services_installation)
  const hasAuditdPkg = /auditd/i.test(playbookContent);
  const hasUfwPkg = /(ufw|nftables)/i.test(playbookContent);
  const hasServiceEnabled = /(state:\s*started|enabled:\s*(true|yes))/i.test(playbookContent);

  if (!hasAuditdPkg || !hasUfwPkg) {
    checks[1].message = "Les paquets 'auditd' et 'ufw' (ou 'nftables') doivent être installés via le playbook.";
  } else if (!hasServiceEnabled) {
    checks[1].message = "Les services de sécurité doivent être activés et démarrés (state: started, enabled: true).";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Installation et activation des services de sécurité (auditd, ufw) validées.";
  }

  // 3. Paramètres Réseau Noyau (sysctl_network_protection)
  const hasSyncookies = /net\.ipv4\.tcp_syncookies\s*=\s*1/.test(sysctlContent);
  const hasRpFilter = /net\.ipv4\.conf\.all\.rp_filter\s*=\s*1/.test(sysctlContent);
  const hasRedirects = /net\.ipv4\.conf\.all\.accept_redirects\s*=\s*0/.test(sysctlContent);
  const hasIpForward = /net\.ipv4\.ip_forward\s*=\s*0/.test(sysctlContent);

  if (!hasSyncookies) {
    checks[2].message = "La directive 'net.ipv4.tcp_syncookies = 1' est requise pour contrer les SYN Floods.";
  } else if (!hasRpFilter) {
    checks[2].message = "Le filtrage Reverse Path 'net.ipv4.conf.all.rp_filter = 1' est requis contre l'usurpation IP.";
  } else if (!hasRedirects || !hasIpForward) {
    checks[2].message = "Le rejet des redirections ICMP et la désactivation du routage IP sont requis.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Paramètres réseau sysctl (SYN Cookies, rp_filter, ICMP, ip_forward) validés.';
  }

  // 4. Protection Mémoire et Déploiement Sysctl (sysctl_kernel_memory_protection)
  const hasAslr = /kernel\.randomize_va_space\s*=\s*2/.test(sysctlContent);
  const hasSysctlTask = /(sysctl|99-security\.conf)/i.test(playbookContent);

  if (!hasAslr) {
    checks[3].message = "L'activation complète de l'ASLR 'kernel.randomize_va_space = 2' est obligatoire.";
  } else if (!hasSysctlTask) {
    checks[3].message = "Le playbook Ansible doit déployer le fichier sysctl vers /etc/sysctl.d/99-security.conf.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Randomisation ASLR du noyau et tâche de déploiement sysctl validées.';
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
  const verdict = validateHardeningConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
