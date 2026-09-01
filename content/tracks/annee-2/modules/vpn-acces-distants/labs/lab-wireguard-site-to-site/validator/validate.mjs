#!/usr/bin/env node

/**
 * Validateur du lab "Tunnel WireGuard Site-à-Site entre Siège et Filiale"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function interfaceBlock(cfg) {
  const m = cfg.match(/\[Interface\]([\s\S]*?)(\[Peer\]|$)/i);
  return m ? m[1] : '';
}

function peerBlock(cfg) {
  const m = cfg.match(/\[Peer\]([\s\S]*)/i);
  return m ? m[1] : '';
}

function allowedIpsOf(cfg) {
  const peer = peerBlock(cfg);
  return peer ? (peer.match(/AllowedIPs\s*=\s*([^\n]+)/) || [])[1] || '' : '';
}

function hasConcreteValue(block, directive) {
  const re = new RegExp(`${directive}\\s*=\\s*\\S+`);
  return re.test(block) && !new RegExp(`${directive}\\s*=\\s*<[^>]*>`).test(block);
}

export function validateWireguardSiteToSite(workDir = '/work') {
  const siegePath = join(workDir, 'wg0-siege.conf');
  const filialePath = join(workDir, 'wg0-filiale.conf');

  const checks = [
    { id: 'interfaces_well_formed', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'peers_declared', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'allowed_ips_routing', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'forwarding_and_keepalive', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(siegePath) || !existsSync(filialePath)) {
    for (const c of checks) {
      c.message = 'Fichiers wg0-siege.conf ou wg0-filiale.conf introuvables dans le répertoire de travail.';
    }
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const siege = readFileSync(siegePath, 'utf-8');
  const filiale = readFileSync(filialePath, 'utf-8');

  // 1. Interfaces bien formées (interfaces_well_formed)
  const ifaceOk = (cfg, expectedIp) => {
    const block = interfaceBlock(cfg);
    const hasAddress = new RegExp(`Address\\s*=\\s*${expectedIp}/24`).test(block);
    const hasPort = /ListenPort\s*=\s*51820/.test(block);
    const hasKey = hasConcreteValue(block, 'PrivateKey');
    return hasAddress && hasPort && hasKey;
  };
  const siegeIface = ifaceOk(siege, '10\\.99\\.0\\.1');
  const filialeIface = ifaceOk(filiale, '10\\.99\\.0\\.2');
  if (!siegeIface && !filialeIface) {
    checks[0].message = "Les deux [Interface] exigent Address 10.99.0.1/24 (siège) et 10.99.0.2/24 (filiale), ListenPort 51820 et une PrivateKey renseignée.";
  } else if (!siegeIface) {
    checks[0].message = "L'interface du siège doit déclarer Address 10.99.0.1/24, ListenPort 51820 et une PrivateKey.";
  } else if (!filialeIface) {
    checks[0].message = "L'interface de la filiale doit déclarer Address 10.99.0.2/24, ListenPort 51820 et une PrivateKey.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Interfaces WireGuard des deux sites complètes.';
  }

  // 2. Peers déclarés (peers_declared)
  const peerOk = (cfg) => hasConcreteValue(peerBlock(cfg), 'PublicKey') && /Endpoint\s*=\s*\d+\.\d+\.\d+\.\d+:\d+/.test(peerBlock(cfg));
  const siegePeer = peerOk(siege);
  const filialePeer = peerOk(filiale);
  if (!siegePeer && !filialePeer) {
    checks[1].message = "Chaque [Peer] doit déclarer PublicKey (sans espace réservé) et Endpoint IP:51820.";
  } else if (!siegePeer) {
    checks[1].message = "Le peer du siège doit déclarer la PublicKey de la filiale et l'Endpoint 198.51.100.20:51820.";
  } else if (!filialePeer) {
    checks[1].message = "Le peer de la filiale doit déclarer la PublicKey du siège et l'Endpoint 203.0.113.10:51820.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Peers croisés avec PublicKey et Endpoint validés.';
  }

  // 3. AllowedIPs croisées (allowed_ips_routing)
  const siegeAllowed = allowedIpsOf(siege);
  const filialeAllowed = allowedIpsOf(filiale);
  const siegeHasLan = /192\.168\.20\.0\/24/.test(siegeAllowed) && /10\.99\.0\.2\/32/.test(siegeAllowed);
  const filialeHasLan = /192\.168\.10\.0\/24/.test(filialeAllowed) && /10\.99\.0\.1\/32/.test(filialeAllowed);
  if (!siegeHasLan || !filialeHasLan) {
    checks[2].message = "Les AllowedIPs doivent être croisées : siège = 10.99.0.2/32, 192.168.20.0/24 ; filiale = 10.99.0.1/32, 192.168.10.0/24.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Routage inter-sites et anti-usurpation (AllowedIPs croisées) validés.';
  }

  // 4. Transit firewall et keepalive (forwarding_and_keepalive)
  const hasForward = (cfg) => /PostUp\s*=.*FORWARD.*wg0.*ACCEPT/.test(cfg) || /PostUp\s*=.*wg0.*FORWARD.*ACCEPT/.test(cfg);
  const siegeForward = hasForward(siege);
  const filialeForward = hasForward(filiale);
  const filialeKeepalive = /PersistentKeepalive\s*=\s*25/.test(filiale);
  if (!siegeForward || !filialeForward) {
    checks[3].message = "Les règles de transit sont requises des deux côtés : PostUp = iptables -A FORWARD -i wg0 -j ACCEPT (et le PostDown symétrique).";
  } else if (!filialeKeepalive) {
    checks[3].message = "La filiale étant derrière un NAT opérateur, PersistentKeepalive = 25 est obligatoire dans son [Peer].";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Transit FORWARD autorisé des deux côtés et keepalive filiale configuré.';
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
  const verdict = validateWireguardSiteToSite(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}