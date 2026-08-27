#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement d'un Tunnel VPN Site-à-Site WireGuard"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateWireguardConfig(workDir = '/work') {
  const filePath = join(workDir, 'wg0.conf');

  const checks = [
    { id: 'interface_address_and_listenport', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'peer_publickey_and_endpoint', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'allowed_ips_remote_networks', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'persistent_keepalive_nat', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier wg0.conf introuvable dans le répertoire de travail.';
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

  // Extraction des sections INI
  const hasInterfaceSection = /\[Interface\]/i.test(rawContent);
  const hasPeerSection = /\[Peer\]/i.test(rawContent);

  if (!hasInterfaceSection || !hasPeerSection) {
    checks[0].message = 'Les sections [Interface] et [Peer] sont obligatoires dans le fichier de configuration WireGuard.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const interfaceBlock = (rawContent.match(/\[Interface\]([\s\S]*?)(\[Peer\]|$)/i) || [])[1] || '';
  const peerBlock = (rawContent.match(/\[Peer\]([\s\S]*?)$/i) || [])[1] || '';

  // 1. [Interface] Address, ListenPort, PrivateKey (interface_address_and_listenport)
  const hasAddress = /Address\s*=\s*10\.100\.0\.1(\/30)?/i.test(interfaceBlock);
  const hasListenPort = /ListenPort\s*=\s*51820\b/i.test(interfaceBlock);
  const hasPrivateKey = /PrivateKey\s*=\s*[A-Za-z0-9+/=]{20,}/i.test(interfaceBlock);

  if (!hasAddress) {
    checks[0].message = "L'adresse IP du tunnel 'Address = 10.100.0.1/30' est requise sous [Interface].";
  } else if (!hasListenPort) {
    checks[0].message = "Le port d'écoute standard 'ListenPort = 51820' doit être configuré sous [Interface].";
  } else if (!hasPrivateKey) {
    checks[0].message = "La clé privée 'PrivateKey' est manquante ou invalide sous [Interface].";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Configuration de la section [Interface] (IP 10.100.0.1/30, Port 51820, Clé privée) validée.';
  }

  // 2. [Peer] PublicKey et Endpoint (peer_publickey_and_endpoint)
  const hasPublicKey = /PublicKey\s*=\s*[A-Za-z0-9+/=]{20,}/i.test(peerBlock);
  const hasEndpoint = /Endpoint\s*=\s*198\.51\.100\.20:51820\b/i.test(peerBlock);

  if (!hasPublicKey) {
    checks[1].message = "La clé publique du pair distant 'PublicKey' est requise sous [Peer].";
  } else if (!hasEndpoint) {
    checks[1].message = "Le point d'accès distant 'Endpoint = 198.51.100.20:51820' est manquant ou incorrect sous [Peer].";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Clé publique du pair et Endpoint distant (198.51.100.20:51820) validés.';
  }

  // 3. [Peer] AllowedIPs (allowed_ips_remote_networks)
  const matchAllowedIPs = peerBlock.match(/AllowedIPs\s*=\s*([^\r\n]+)/i);
  const allowedIPsStr = matchAllowedIPs ? matchAllowedIPs[1] : '';

  const hasRemoteTunnelIp = /10\.100\.0\.2(\/32)?/i.test(allowedIPsStr);
  const hasRemoteSubnet = /192\.168\.20\.0\/24/i.test(allowedIPsStr);

  if (!hasRemoteTunnelIp || !hasRemoteSubnet) {
    checks[2].message = "La directive 'AllowedIPs' doit autoriser à la fois l'IP du pair distant (10.100.0.2/32) ET le sous-réseau de l'agence (192.168.20.0/24).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Cryptokey Routing validé : AllowedIPs inclut 10.100.0.2/32 et 192.168.20.0/24.';
  }

  // 4. [Peer] PersistentKeepalive (persistent_keepalive_nat)
  const matchKeepalive = peerBlock.match(/PersistentKeepalive\s*=\s*(\d+)/i);
  const keepaliveVal = matchKeepalive ? parseInt(matchKeepalive[1], 10) : 0;

  if (keepaliveVal < 15 || keepaliveVal > 30) {
    checks[3].message = "La directive 'PersistentKeepalive' doit être configurée avec une valeur de maintien d'état appropriée (ex: 25 secondes).";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Maintien de session NAT (PersistentKeepalive = 25s) validé.';
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
  const verdict = validateWireguardConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
