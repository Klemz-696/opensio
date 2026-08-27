#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement et Configuration Idempotente d'un Serveur Web avec Ansible"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateAnsiblePlaybook(workDir = '/work') {
  const filePath = join(workDir, 'playbook.yml');

  const checks = [
    { id: 'play_header_and_privileges', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'package_installation_and_service', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'template_vhost_and_symlink', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'handlers_and_cleanup_default', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier playbook.yml introuvable dans le répertoire de travail.';
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

  // Ignorer les commentaires pour l'analyse
  const cleanContent = rawContent
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

  // 1. Entête du play et élévation de privilèges (play_header_and_privileges)
  const hasHosts = /hosts:\s*(webservers|all)\b/i.test(cleanContent);
  const hasBecome = /become:\s*(true|yes)\b/i.test(cleanContent);

  if (!hasHosts) {
    checks[0].message = "La directive 'hosts: webservers' (ou 'all') est requise en entête du play.";
  } else if (!hasBecome) {
    checks[0].message = "L'élévation de privilèges 'become: true' est requise pour administrer les paquets et services système.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Entête du play et élévation de privilèges (hosts: webservers, become: true) validées.';
  }

  // 2. Gestion des paquets et du service (package_installation_and_service)
  const hasAptNginx = /(ansible\.builtin\.)?apt:\s*\n[\s\S]*?name:\s*nginx[\s\S]*?state:\s*(present|latest)/i.test(cleanContent);
  const hasAptCache = /(ansible\.builtin\.)?apt:\s*\n[\s\S]*?update_cache:\s*(yes|true)/i.test(cleanContent);
  const hasSystemdService = /(ansible\.builtin\.)?(systemd|service):\s*\n[\s\S]*?name:\s*nginx[\s\S]*?state:\s*started[\s\S]*?enabled:\s*(yes|true)/i.test(cleanContent);

  if (!hasAptNginx || !hasAptCache) {
    checks[1].message = "L'installation du paquet nginx avec le module 'apt' (name: nginx, state: present, update_cache: yes) est requise.";
  } else if (!hasSystemdService) {
    checks[1].message = "L'activation et le démarrage du service nginx via 'systemd' (state: started, enabled: yes) sont requis.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Installation idempotente du paquet Nginx et gestion du service systemd validées.';
  }

  // 3. Template VirtualHost et lien symbolique (template_vhost_and_symlink)
  const hasTemplateTask = /(ansible\.builtin\.)?template:\s*\n[\s\S]*?dest:\s*\/etc\/nginx\/sites-available\/app\.conf/i.test(cleanContent);
  const hasSymlinkTask = /(ansible\.builtin\.)?file:\s*\n[\s\S]*?dest:\s*\/etc\/nginx\/sites-enabled\/app\.conf[\s\S]*?state:\s*link/i.test(cleanContent);

  if (!hasTemplateTask) {
    checks[2].message = "Le déploiement du VirtualHost avec le module 'template' vers '/etc/nginx/sites-available/app.conf' est manquant.";
  } else if (!hasSymlinkTask) {
    checks[2].message = "L'activation du site via lien symbolique avec le module 'file' (state: link dans sites-enabled) est manquante.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Déploiement du template Jinja2 et activation par lien symbolique validés.';
  }

  // 4. Nettoyage configuration par défaut et Handlers (handlers_and_cleanup_default)
  const hasRemoveDefault = /(ansible\.builtin\.)?file:\s*\n[\s\S]*?\/etc\/nginx\/sites-enabled\/default[\s\S]*?state:\s*absent/i.test(cleanContent);
  const hasHandlersSection = /handlers:\s*\n[\s\S]*?(ansible\.builtin\.)?(systemd|service):\s*\n[\s\S]*?state:\s*reloaded/i.test(cleanContent);
  const hasNotify = /notify:\s*[^\n]+/i.test(cleanContent);

  if (!hasRemoveDefault) {
    checks[3].message = "La suppression de la configuration par défaut '/etc/nginx/sites-enabled/default' (state: absent) est requise.";
  } else if (!hasHandlersSection || !hasNotify) {
    checks[3].message = "La section 'handlers' doit déclarer le rechargement de Nginx (state: reloaded) déclenché par la directive 'notify'.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Suppression du site par défaut et configuration des Handlers de rechargement validées.';
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
  const verdict = validateAnsiblePlaybook(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
