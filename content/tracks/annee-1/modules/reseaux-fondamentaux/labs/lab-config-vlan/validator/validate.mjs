#!/usr/bin/env node

/**
 * Validateur du lab "Configuration et segmentation par VLAN sur commutateur d'entreprise"
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateSwitchCfg(workDir = '/work') {
  const cfgPath = join(workDir, 'switch.cfg');

  const checks = [
    { id: 'vlan_db_valid', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'access_ports_valid', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'trunk_configured', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'management_configured', passed: false, points: 0, maxPoints: 10, message: '' },
  ];

  if (!existsSync(cfgPath)) {
    checks[0].message = 'Fichier switch.cfg introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(cfgPath, 'utf-8');
  const normalized = rawContent
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');

  // 1. Vérification de la base de données VLAN (vlan_db_valid)
  const hasVlan10 = /vlan 10\b/.test(normalized);
  const hasVlan20 = /vlan 20\b/.test(normalized);
  const hasVlan30 = /vlan 30\b/.test(normalized);
  const hasVlan99 = /vlan 99\b/.test(normalized);

  const hasName10 = /name (direction|dir)\b/.test(normalized);
  const hasName20 = /name (commercial|com)\b/.test(normalized);
  const hasName30 = /name (technique|tech)\b/.test(normalized);
  const hasName99 = /name (administration|admin|mgmt|gestion)\b/.test(normalized);

  if (hasVlan10 && hasVlan20 && hasVlan30 && hasVlan99 && hasName10 && hasName20 && hasName30 && hasName99) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'VLANs 10, 20, 30 et 99 correctement créés et nommés.';
  } else {
    const missing = [];
    if (!hasVlan10 || !hasName10) missing.push('VLAN 10 Direction');
    if (!hasVlan20 || !hasName20) missing.push('VLAN 20 Commercial');
    if (!hasVlan30 || !hasName30) missing.push('VLAN 30 Technique');
    if (!hasVlan99 || !hasName99) missing.push('VLAN 99 Administration');
    checks[0].message = `Définitions de VLANs manquantes ou incomplètes : ${missing.join(', ')}.`;
  }

  // 2. Vérification des ports d'accès (access_ports_valid)
  const hasFa01to04 = (
    (/interface range (fa|fastethernet)\s*0\/1\s*-\s*4\b/.test(normalized) ||
      (/interface (fa|fastethernet)\s*0\/1\b/.test(normalized) && /interface (fa|fastethernet)\s*0\/4\b/.test(normalized))) &&
    /switchport access vlan 10\b/.test(normalized)
  );

  const hasFa05to08 = (
    (/interface range (fa|fastethernet)\s*0\/5\s*-\s*8\b/.test(normalized) ||
      (/interface (fa|fastethernet)\s*0\/5\b/.test(normalized) && /interface (fa|fastethernet)\s*0\/8\b/.test(normalized))) &&
    /switchport access vlan 20\b/.test(normalized)
  );

  const hasFa09to12 = (
    (/interface range (fa|fastethernet)\s*0\/9\s*-\s*12\b/.test(normalized) ||
      (/interface (fa|fastethernet)\s*0\/9\b/.test(normalized) && /interface (fa|fastethernet)\s*0\/12\b/.test(normalized))) &&
    /switchport access vlan 30\b/.test(normalized)
  );

  const hasModeAccess = /switchport mode access\b/.test(normalized);

  if (hasFa01to04 && hasFa05to08 && hasFa09to12 && hasModeAccess) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Ports d\'accès Fa0/1 à Fa0/12 correctement configurés et affectés aux VLANs 10, 20 et 30.';
  } else {
    const missing = [];
    if (!hasFa01to04) missing.push('Fa0/1-4 -> VLAN 10');
    if (!hasFa05to08) missing.push('Fa0/5-8 -> VLAN 20');
    if (!hasFa09to12) missing.push('Fa0/9-12 -> VLAN 30');
    if (!hasModeAccess) missing.push('switchport mode access');
    checks[1].message = `Configuration des ports d'accès incomplète : ${missing.join(', ')}.`;
  }

  // 3. Vérification du port Trunk (trunk_configured)
  const hasGi01 = /interface (gi|gigabitethernet)\s*0\/1\b/.test(normalized);
  const hasTrunkMode = /switchport mode trunk\b/.test(normalized);
  const hasNative99 = /switchport trunk native vlan 99\b/.test(normalized);
  const hasAllowed = /switchport trunk allowed vlan (10,20,30,99|10-30,99|10,20,30,99\b)/.test(normalized);

  if (hasGi01 && hasTrunkMode && hasNative99 && hasAllowed) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Port Trunk Gi0/1 correctement configuré avec encapsulation, VLAN natif 99 et filtrage des VLANs autorisés.';
  } else {
    const missing = [];
    if (!hasGi01) missing.push('interface Gi0/1');
    if (!hasTrunkMode) missing.push('switchport mode trunk');
    if (!hasNative99) missing.push('switchport trunk native vlan 99');
    if (!hasAllowed) missing.push('switchport trunk allowed vlan 10,20,30,99');
    checks[2].message = `Configuration Trunk Gi0/1 non conforme : ${missing.join(', ')}.`;
  }

  // 4. Vérification de la gestion SVI (management_configured)
  const hasSvi99 = /interface vlan 99\b/.test(normalized);
  const hasIpSvi = /ip address 192\.168\.99\.2 255\.255\.255\.0\b/.test(normalized);
  const hasDefaultGw = /ip default-gateway 192\.168\.99\.1\b/.test(normalized);

  if (hasSvi99 && hasIpSvi && hasDefaultGw) {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Interface SVI VLAN 99 (192.168.99.2/24) et passerelle par défaut (192.168.99.1) opérationnelles.';
  } else {
    checks[3].message = 'Configuration de l\'interface de gestion SVI VLAN 99 ou de la passerelle incomplète.';
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.filter((c) => c.id !== 'management_configured').every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateSwitchCfg(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
