#!/usr/bin/env node

/**
 * Validateur du lab "Configuration de Découverte Réseau et Inventaire SNMP"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateSnmpDiscovery(workDir = '/work') {
  const filePath = join(workDir, 'snmp-discovery.yaml');

  const checks = [
    { id: 'task_header_and_proxy', passed: false, points: 0, maxPoints: 20, message: '' },
    { id: 'targets_ip_ranges', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'credentials_snmp_v2c_v3', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'topology_lldp_options', passed: false, points: 0, maxPoints: 20, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier snmp-discovery.yaml introuvable dans le répertoire de travail.';
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

  // 1. Contrôle de l'en-tête de tâche et de l'agent proxy (task_header_and_proxy)
  const hasTask = lines.some((l) => /^\s*task:\s*$/i.test(l));
  const hasEnabled = lines.some((l) => /enabled:\s*true/i.test(l));
  const hasProxy = lines.some((l) => /agent_proxy:\s*["']?[a-z0-9._-]+["']?/i.test(l) && !/""|''/.test(l));

  if (!hasTask || !hasEnabled) {
    checks[0].message = "La section 'task' avec 'enabled: true' est requise.";
  } else if (!hasProxy) {
    checks[0].message = "La directive 'agent_proxy' doit déclarer l'adresse ou le FQDN de l'agent passerelle.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = "En-tête de tâche et agent proxy d'inventaire validés.";
  }

  // 2. Contrôle des cibles IP (targets_ip_ranges)
  const hasTargets = lines.some((l) => /^\s*targets:\s*$/i.test(l));
  const hasSwitchRange = lines.some((l) => /192\.168\.10\./i.test(l));
  const hasPrinterRange = lines.some((l) => /192\.168\.20\./i.test(l));

  if (!hasTargets) {
    checks[1].message = "La section 'targets' est manquante.";
  } else if (!hasSwitchRange) {
    checks[1].message = 'La plage IP des commutateurs (192.168.10.x) est manquante ou invalide.';
  } else if (!hasPrinterRange) {
    checks[1].message = 'La plage IP des imprimantes (192.168.20.x) est manquante ou invalide.';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Périmètres IP pour les commutateurs et copieurs correctement définis.';
  }

  // 3. Contrôle des profils SNMP v2c et v3 (credentials_snmp_v2c_v3)
  const hasV2c = lines.some((l) => /2c/i.test(l)) && lines.some((l) => /community:\s*["']?[a-z0-9_-]+["']?/i.test(l));
  const hasV3 = lines.some((l) => /version:\s*3/i.test(l));
  const hasAuthPriv = lines.some((l) => /authPriv/i.test(l));
  const hasSha = lines.some((l) => /auth_proto:\s*["']?SHA["']?/i.test(l));
  const hasAes = lines.some((l) => /priv_proto:\s*["']?AES["']?/i.test(l));

  if (!hasV2c) {
    checks[2].message = "Un profil SNMP v2c avec directive 'community' valide est requis.";
  } else if (!hasV3 || !hasAuthPriv) {
    checks[2].message = "Un profil SNMP v3 sécurisé avec 'security_level: authPriv' est requis.";
  } else if (!hasSha || !hasAes) {
    checks[2].message = "Le profil SNMP v3 doit utiliser 'auth_proto: SHA' et 'priv_proto: AES'.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Profils d’authentification SNMP v2c et SNMP v3 (authPriv, SHA, AES) conformes.';
  }

  // 4. Contrôle des options de topologie LLDP et tables ARP (topology_lldp_options)
  const hasLldp = lines.some((l) => /link_lldp_cdp:\s*true/i.test(l));
  const hasArp = lines.some((l) => /update_arp_table:\s*true/i.test(l) || /update_ip_mac_arp:\s*true/i.test(l));

  if (!hasLldp) {
    checks[3].message = "L'option 'link_lldp_cdp: true' doit être activée pour associer automatiquement les ports de switch.";
  } else if (!hasArp) {
    checks[3].message = "L'option 'update_arp_table: true' doit être activée pour collecter la cartographie IP/MAC.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Options de topologie réseau et apprentissage ARP validées.';
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
  const verdict = validateSnmpDiscovery(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
