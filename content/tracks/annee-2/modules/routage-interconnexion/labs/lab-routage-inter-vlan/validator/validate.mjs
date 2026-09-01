#!/usr/bin/env node

/**
 * Validateur du lab "Configuration et Déploiement du Routage Inter-VLAN (RoaS & SVI)"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateIntervlanConfig(workDir = '/work') {
  const filePath = join(workDir, 'intervlan.ios');

  const checks = [
    { id: 'roas_subinterfaces_encapsulation', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'switch_l3_ip_routing_and_vlans', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'switch_l3_svi_configuration', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'trunk_ports_and_descriptions', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier intervlan.ios introuvable dans le répertoire de travail.';
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

  // 1. Sous-interfaces Router-on-a-Stick (roas_subinterfaces_encapsulation)
  const hasSub10 = /interface\s+GigabitEthernet0\/0\/0\.10[\s\S]*?encapsulation\s+dot1Q\s+10[\s\S]*?ip\s+address\s+192\.168\.10\.254\s+255\.255\.255\.0/i.test(rawContent);
  const hasSub20 = /interface\s+GigabitEthernet0\/0\/0\.20[\s\S]*?encapsulation\s+dot1Q\s+20[\s\S]*?ip\s+address\s+192\.168\.20\.254\s+255\.255\.255\.0/i.test(rawContent);
  const hasSub30 = /interface\s+GigabitEthernet0\/0\/0\.30[\s\S]*?encapsulation\s+dot1Q\s+30[\s\S]*?ip\s+address\s+192\.168\.30\.254\s+255\.255\.255\.0/i.test(rawContent);

  if (!hasSub10 || !hasSub20 || !hasSub30) {
    checks[0].message = "Les 3 sous-interfaces RoaS (.10, .20, .30) doivent comporter la directive 'encapsulation dot1Q <id>' et l'adresse IP correspondante (.254).";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Sous-interfaces Router-on-a-Stick et encapsulation 802.1Q configurées avec succès.';
  }

  // 2. IP Routing et déclaration des VLANs sur le switch L3 (switch_l3_ip_routing_and_vlans)
  const lines = rawContent.split('\n').map((l) => l.trim()).filter((l) => !l.startsWith('!'));
  const hasIpRouting = lines.some((l) => /^ip\s+routing\b/i.test(l));
  const hasVlan10 = lines.some((l) => /^vlan\s+10\b/i.test(l));
  const hasVlan20 = lines.some((l) => /^vlan\s+20\b/i.test(l));
  const hasVlan30 = lines.some((l) => /^vlan\s+30\b/i.test(l));

  if (!hasIpRouting) {
    checks[1].message = "La commande globale 'ip routing' est obligatoire sur le commutateur de niveau 3 pour activer le routage IPv4.";
  } else if (!hasVlan10 || !hasVlan20 || !hasVlan30) {
    checks[1].message = 'Les VLANs 10, 20 et 30 doivent être déclarés dans la base de données VLAN du commutateur L3.';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Activation du routage et déclaration des VLANs validées sur SW-CORE-L3.';
  }

  // 3. Configuration des SVIs (switch_l3_svi_configuration)
  const hasSvi10 = /interface\s+Vlan\s*10[\s\S]*?ip\s+address\s+192\.168\.10\.254\s+255\.255\.255\.0/i.test(rawContent);
  const hasSvi20 = /interface\s+Vlan\s*20[\s\S]*?ip\s+address\s+192\.168\.20\.254\s+255\.255\.255\.0/i.test(rawContent);
  const hasSvi30 = /interface\s+Vlan\s*30[\s\S]*?ip\s+address\s+192\.168\.30\.254\s+255\.255\.255\.0/i.test(rawContent);

  if (!hasSvi10 || !hasSvi20 || !hasSvi30) {
    checks[2].message = "Les 3 interfaces virtuelles SVI ('interface Vlan10', 'interface Vlan20', 'interface Vlan30') doivent être configurées avec leurs adresses IP de passerelle (.254).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Interfaces virtuelles de routage (SVIs Vlan10, Vlan20, Vlan30) conformes.';
  }

  // 4. Ports Trunk et activation (trunk_ports_and_descriptions)
  const hasTrunkMode = /switchport\s+mode\s+trunk\b/i.test(rawContent);
  const hasNoShutdown = /no\s+shutdown\b/i.test(rawContent);

  if (!hasTrunkMode) {
    checks[3].message = "Le port de liaison montante doit être configuré en mode Trunk ('switchport mode trunk').";
  } else if (!hasNoShutdown) {
    checks[3].message = "Les interfaces physiques doivent être déverrouillées avec 'no shutdown'.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Configuration du port Trunk 802.1Q et activation matérielle validées.';
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
  const verdict = validateIntervlanConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
