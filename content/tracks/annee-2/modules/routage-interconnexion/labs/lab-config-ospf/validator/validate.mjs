#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement et Optimisation du Routage Dynamique OSPFv2"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateOspfConfig(workDir = '/work') {
  const filePath = join(workDir, 'frr.conf');

  const checks = [
    { id: 'router_id_and_reference_bandwidth', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'ospf_area0_network_advertisements', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'interface_costs_and_metrics', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'passive_interface_and_default_originate', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier frr.conf introuvable dans le répertoire de travail.';
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
  const lower = rawContent.toLowerCase();

  // 1. Router-ID et Reference-Bandwidth (router_id_and_reference_bandwidth)
  const hasRouterId = /router-id\s+10\.255\.255\.1/i.test(rawContent);
  const hasAutoCost = /auto-cost\s+reference-bandwidth\s+(\d+)/i.test(rawContent);
  const matchAutoCost = rawContent.match(/auto-cost\s+reference-bandwidth\s+(\d+)/i);
  const refBw = matchAutoCost ? parseInt(matchAutoCost[1], 10) : 0;

  if (!hasRouterId) {
    checks[0].message = "Le Router-ID OSPF doit être configuré à '10.255.255.1' (directive 'ospf router-id 10.255.255.1').";
  } else if (!hasAutoCost || refBw < 10000) {
    checks[0].message = "La bande passante de référence doit être réajustée (ex: 'auto-cost reference-bandwidth 100000' pour 100 Gbps).";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Router-ID 10.255.255.1 et bande passante de référence configurés avec succès.';
  }

  // 2. Annonce des réseaux dans l'Area 0 (ospf_area0_network_advertisements)
  const hasNet10_0 = /network\s+10\.0\.0\.0(\/30|\s+0\.0\.0\.3)?\s+area\s+(0|0\.0\.0\.0)/i.test(rawContent);
  const hasNet10_4 = /network\s+10\.0\.0\.4(\/30|\s+0\.0\.0\.3)?\s+area\s+(0|0\.0\.0\.0)/i.test(rawContent);
  const hasNet192 = /network\s+192\.168\.100\.0(\/24|\s+0\.0\.0\.255)?\s+area\s+(0|0\.0\.0\.0)/i.test(rawContent);
  const hasNetLo = /network\s+10\.255\.255\.1(\/32|\s+0\.0\.0\.0)?\s+area\s+(0|0\.0\.0\.0)/i.test(rawContent) || /network\s+10\.0\.0\.0\/8\s+area\s+0/i.test(rawContent);

  if (!hasNet10_0 || !hasNet10_4 || !hasNet192) {
    checks[1].message = "Les réseaux d'interconnexion (10.0.0.0/30, 10.0.0.4/30) et le LAN utilisateur (192.168.100.0/24) doivent être annoncés dans l'Area 0.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Ensemble des réseaux annoncés dans la zone Backbone Area 0.';
  }

  // 3. Coûts d'interfaces et métriques (interface_costs_and_metrics)
  // Vérifier sous interface eth1 le coût 10, et sous eth2 le coût 100
  const eth1BlockMatch = rawContent.match(/interface\s+eth1([\s\S]*?)(!|interface|$)/i);
  const eth2BlockMatch = rawContent.match(/interface\s+eth2([\s\S]*?)(!|interface|$)/i);

  const eth1HasCost10 = eth1BlockMatch && /ip\s+ospf\s+cost\s+10\b/i.test(eth1BlockMatch[1]);
  const eth2HasCost100 = eth2BlockMatch && /ip\s+ospf\s+cost\s+100\b/i.test(eth2BlockMatch[1]);

  if (!eth1HasCost10) {
    checks[2].message = "L'interface eth1 (liaison 10G vers R2) doit avoir son coût OSPF configuré à '10' ('ip ospf cost 10').";
  } else if (!eth2HasCost100) {
    checks[2].message = "L'interface eth2 (liaison 1G vers R3) doit avoir son coût OSPF configuré à '100' ('ip ospf cost 100').";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Coûts métriques d’interfaces (eth1=10, eth2=100) validés.';
  }

  // 4. Passive-interface et Default-information originate (passive_interface_and_default_originate)
  const hasPassiveEth0 = /passive-interface\s+eth0/i.test(rawContent) || (/passive-interface\s+default/i.test(rawContent) && /no\s+passive-interface\s+eth1/i.test(rawContent));
  const hasDefaultOriginate = /default-information\s+originate/i.test(rawContent);

  if (!hasPassiveEth0) {
    checks[3].message = "L'interface utilisateur eth0 doit être configurée en 'passive-interface eth0' pour ne pas diffuser de Hello vers les postes clients.";
  } else if (!hasDefaultOriginate) {
    checks[3].message = "La propagation de la route par défaut vers Internet doit être activée avec 'default-information originate'.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Protection passive-interface et propagation de la route par défaut conformes.';
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
  const verdict = validateOspfConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
