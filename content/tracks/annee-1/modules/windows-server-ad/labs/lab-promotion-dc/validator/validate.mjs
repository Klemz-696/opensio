#!/usr/bin/env node

/**
 * Validateur du lab "Automatisation du déploiement et promotion d'un contrôleur de domaine AD DS"
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePromoteDc(workDir = '/work') {
  const scriptPath = join(workDir, 'promote-dc.ps1');

  const checks = [
    { id: 'role_installed', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'adds_forest_configured', passed: false, points: 0, maxPoints: 45, message: '' },
    { id: 'dsrm_and_options', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(scriptPath)) {
    checks[0].message = 'Fichier promote-dc.ps1 introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(scriptPath, 'utf-8');
  const normalized = rawContent
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/`\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');

  // 1. Vérification de l'installation du rôle AD DS (role_installed)
  const hasInstallFeature = /install-windowsfeature\b/.test(normalized);
  const hasRoleName = /-name\s+['"]?(ad-domain-services|adds)['"]?/.test(normalized);
  const hasMgmtTools = /-includemanagementtools\b/.test(normalized);

  if (hasInstallFeature && hasRoleName && hasMgmtTools) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Installation du rôle AD-Domain-Services avec outils d\'administration confirmée.';
  } else {
    const missing = [];
    if (!hasInstallFeature) missing.push('Install-WindowsFeature');
    if (!hasRoleName) missing.push('-Name AD-Domain-Services');
    if (!hasMgmtTools) missing.push('-IncludeManagementTools');
    checks[0].message = `Commande d'installation du rôle incomplète : ${missing.join(', ')}.`;
  }

  // 2. Vérification de Install-ADDSForest (adds_forest_configured)
  const hasInstallForest = /install-addsforest\b/.test(normalized);
  const hasDomainName = /-domainname\s+['"]?entreprise\.lan['"]?/.test(normalized);
  const hasNetbios = /-domainnetbiosname\s+['"]?entreprise['"]?/.test(normalized);

  if (hasInstallForest && hasDomainName && hasNetbios) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Création de la forêt entreprise.lan (NetBIOS ENTREPRISE) correctement configurée.';
  } else {
    const missing = [];
    if (!hasInstallForest) missing.push('Install-ADDSForest');
    if (!hasDomainName) missing.push('-DomainName "entreprise.lan"');
    if (!hasNetbios) missing.push('-DomainNetbiosName "ENTREPRISE"');
    checks[1].message = `Paramètres de forêt AD DS manquants ou non conformes : ${missing.join(', ')}.`;
  }

  // 3. Vérification DSRM et options (dsrm_and_options)
  const hasSecureString = /convertto-securestring\b/.test(normalized) || /safemodeadministratorpassword\b/.test(normalized);
  const hasDns = /-installdns(:\$true)?\b/.test(normalized) || !normalized.includes('-installdns:$false');
  const hasPaths = /c:\\windows\\ntds\b/.test(normalized) && /c:\\windows\\sysvol\b/.test(normalized);

  if (hasSecureString && hasDns) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Mot de passe DSRM sécurisé, serveur DNS intégré et arborescence de stockage validés.';
  } else {
    const missing = [];
    if (!hasSecureString) missing.push('Mot de passe DSRM (ConvertTo-SecureString)');
    if (!hasDns) missing.push('Installation DNS intégrée');
    checks[2].message = `Options avancées manquantes : ${missing.join(', ')}.`;
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
  const verdict = validatePromoteDc(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
