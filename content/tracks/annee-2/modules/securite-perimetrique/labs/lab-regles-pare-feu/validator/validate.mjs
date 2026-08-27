#!/usr/bin/env node

/**
 * Validateur du lab "Configuration d'un Pare-feu Périmétrique avec État (nftables)"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateNftablesConfig(workDir = '/work') {
  const filePath = join(workDir, 'nftables.conf');

  const checks = [
    { id: 'nftables_structure_and_flush', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'input_chain_stateful_and_ssh', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'forward_chain_zones_and_dmz_rules', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'nat_dnat_and_masquerade', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier nftables.conf introuvable dans le répertoire de travail.';
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

  // Ignorer les commentaires pour l'analyse des règles
  const linesWithoutComments = rawContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !l.startsWith('#'))
    .join('\n');

  // 1. Structure globale et flush (nftables_structure_and_flush)
  const hasFlush = /flush\s+ruleset\b/i.test(linesWithoutComments);
  const hasTableFilter = /table\s+(inet|ip)\s+filter\b/i.test(linesWithoutComments);
  const hasTableNat = /table\s+(ip|inet)\s+nat\b/i.test(linesWithoutComments);

  if (!hasFlush) {
    checks[0].message = "La directive initiale 'flush ruleset' est requise pour réinitialiser les règles de manière idempotente.";
  } else if (!hasTableFilter) {
    checks[0].message = "La table de filtrage 'table inet filter' est manquante.";
  } else if (!hasTableNat) {
    checks[0].message = "La table de translation 'table ip nat' est manquante.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure nftables globale, flush ruleset et tables de filtrage/NAT validées.';
  }

  // 2. Extraction robuste des blocs de chaînes (en gérant les accolades imbriquées de ct state { ... })
  const extractChainBlock = (chainName) => {
    const regex = new RegExp(`chain\\s+${chainName}\\s*\\{([\\s\\S]*?)(?:\\n\\s*chain\\s+|\\n\\s*\\}\\s*\\n\\s*\\}|$)`, 'i');
    const match = linesWithoutComments.match(regex);
    return match ? match[1] : '';
  };

  const inputBlock = extractChainBlock('input');
  const fwdBlock = extractChainBlock('forward');

  // 2. Chaîne INPUT : policy drop, suivi d'état et SSH LAN (input_chain_stateful_and_ssh)
  const inputHasPolicyDrop = /policy\s+drop\b/i.test(inputBlock);
  const inputHasLoopback = /iif\s+"?lo"?\s+accept\b/i.test(inputBlock);
  const inputHasStateful = /ct\s+state\s+(\{\s*)?established/i.test(inputBlock);
  const inputHasInvalid = /ct\s+state\s+invalid\s+drop\b/i.test(inputBlock);
  const inputHasSshLan = /iif\s+"?eth0"?[\s\S]*?tcp\s+dport\s+22[\s\S]*?accept/i.test(inputBlock) || /tcp\s+dport\s+22[\s\S]*?iif\s+"?eth0"?[\s\S]*?accept/i.test(inputBlock);

  if (!inputHasPolicyDrop) {
    checks[1].message = "La chaîne input doit comporter la politique par défaut 'policy drop;'.";
  } else if (!inputHasLoopback || !inputHasStateful || !inputHasInvalid) {
    checks[1].message = "La chaîne input doit accepter la boucle locale ('lo'), jeter les paquets 'invalid' et accepter les flux 'established, related'.";
  } else if (!inputHasSshLan) {
    checks[1].message = "L'accès SSH (port 22) doit être explicitement restreint à l'interface LAN eth0.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Chaîne INPUT stateful, boucle locale, protection invalid et accès SSH sécurisés.';
  }

  // 3. Chaîne FORWARD : policy drop, flux inter-zones et confinement DMZ (forward_chain_zones_and_dmz_rules)
  const fwdHasPolicyDrop = /policy\s+drop\b/i.test(fwdBlock);
  const fwdHasStateful = /ct\s+state\s+(\{\s*)?established/i.test(fwdBlock);
  const fwdHasLanToWan = /iif\s+"?eth0"?\s+oif\s+"?eth1"?[\s\S]*?accept/i.test(fwdBlock);
  const fwdHasWanToDmz = /iif\s+"?eth1"?\s+oif\s+"?eth2"?[\s\S]*?(192\.168\.50\.10|tcp\s+dport)[\s\S]*?accept/i.test(fwdBlock);
  const fwdHasDmzToLanLeak = /iif\s+"?eth2"?\s+oif\s+"?eth0"?\s+(ct\s+state\s+new\s+)?accept\b/i.test(fwdBlock);

  if (!fwdHasPolicyDrop) {
    checks[2].message = "La chaîne forward doit comporter la politique par défaut 'policy drop;'.";
  } else if (!fwdHasStateful) {
    checks[2].message = "Le suivi d'état (ct state { established, related } accept) est requis dans la chaîne forward.";
  } else if (!fwdHasLanToWan) {
    checks[2].message = "Le flux sortant du LAN (eth0) vers le WAN (eth1) doit être autorisé.";
  } else if (!fwdHasWanToDmz) {
    checks[2].message = "L'accès public depuis le WAN (eth1) vers le Reverse Proxy DMZ (192.168.50.10) sur les ports 80/443 doit être autorisé.";
  } else if (fwdHasDmzToLanLeak) {
    checks[2].message = "Violation de sécurité critique : la DMZ ne doit pas être autorisée à initier des flux vers le LAN interne (iif eth2 oif eth0 accept interdit).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Chaîne FORWARD conforme : Default-Deny, flux LAN->WAN, WAN->DMZ et confinement DMZ validés.';
  }

  // 4. Table NAT : DNAT et Masquerade (nat_dnat_and_masquerade)
  const hasDnat = /dnat\s+to\s+192\.168\.50\.10/i.test(linesWithoutComments);
  const hasMasquerade = /oif\s+"?eth1"?\s+masquerade\b/i.test(linesWithoutComments) || /masquerade\b/i.test(linesWithoutComments);

  if (!hasDnat) {
    checks[3].message = "La règle de redirection DNAT vers l'adresse DMZ 192.168.50.10 sur les ports 80/443 est manquante dans prerouting.";
  } else if (!hasMasquerade) {
    checks[3].message = "La règle de masquage de source 'masquerade' sur l'interface WAN eth1 est manquante dans postrouting.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Règles NAT : redirection DNAT vers DMZ et Masquerade sortant WAN validées.';
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
  const verdict = validateNftablesConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
