#!/usr/bin/env node

/**
 * Validateur du lab "Serveur OpenVPN Nomade : Mode routé, Certificats et Profils Clients"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateOpenvpnNomade(workDir = '/work') {
  const serverPath = join(workDir, 'server.conf');
  const clientPath = join(workDir, 'client-nomade.ovpn');

  const checks = [
    { id: 'server_transport_tun', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'pki_and_tls_crypt', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'modern_crypto', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'push_and_client_profile', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(serverPath) || !existsSync(clientPath)) {
    for (const c of checks) {
      c.message = 'Fichiers server.conf ou client-nomade.ovpn introuvables dans le répertoire de travail.';
    }
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const server = readFileSync(serverPath, 'utf-8');
  const client = readFileSync(clientPath, 'utf-8');
  const activeLines = (text) => text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const serverActive = activeLines(server);
  const clientActive = activeLines(client);

  // 1. Transport et interface tun (server_transport_tun)
  const hasPort = /port\s+1194/.test(serverActive);
  const hasUdp = /proto\s+udp/.test(serverActive);
  const hasTun = /dev\s+tun/.test(serverActive);
  const hasSubnet = /server\s+10\.8\.0\.0\s+255\.255\.255\.0/.test(serverActive);
  if (!hasPort || !hasUdp) {
    checks[0].message = "Le serveur doit écouter en UDP sur le port 1194 (port 1194, proto udp).";
  } else if (!hasTun || !hasSubnet) {
    checks[0].message = hasTun
      ? "Le sous-réseau VPN doit être déclaré : server 10.8.0.0 255.255.255.0."
      : "L'interface virtuelle routée est requise : dev tun.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Transport UDP 1194 et mode routé tun 10.8.0.0/24 validés.';
  }

  // 2. PKI et tls-crypt (pki_and_tls_crypt)
  const hasCa = /ca\s+\S*ca-racine\.pem/.test(serverActive);
  const hasCert = /cert\s+\S*vpn-server\.crt/.test(serverActive);
  const hasKey = /key\s+\S*vpn-server\.key/.test(serverActive);
  const hasDhNone = /dh\s+none/.test(serverActive);
  const hasTlsCrypt = /tls-crypt\s+\S+/.test(serverActive);
  if (!hasCa || !hasCert || !hasKey) {
    checks[1].message = "Les trois ancres PKI sont requises : ca (ca-racine.pem), cert (vpn-server.crt) et key (vpn-server.key).";
  } else if (!hasDhNone || !hasTlsCrypt) {
    checks[1].message = "Il faut dh none (ECDH) et tls-crypt pour chiffrer le canal de contrôle.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Ancres PKI, dh none et tls-crypt validés.';
  }

  // 3. Chiffrement moderne (modern_crypto)
  const hasTlsMin = /tls-version-min\s+1\.2/.test(serverActive);
  const dataCiphers = (serverActive.match(/data-ciphers\s+([^\n]+)/) || [])[1] || '';
  const hasAead = /(AES-\d+-GCM|CHACHA20-POLY1305)/.test(dataCiphers);
  const hasLegacy = /(BF-CBC|DES-CBC|DES-EDE|RC4)/.test(dataCiphers);
  if (!hasTlsVersionMin(serverActive)) {
    checks[2].message = "Le minimum TLS doit être imposé : tls-version-min 1.2.";
  } else if (!hasAead) {
    checks[2].message = "data-ciphers doit contenir des suites AEAD : AES-256-GCM ou CHACHA20-POLY1305.";
  } else if (hasLegacy) {
    checks[2].message = "Des suites obsolètes (BF-CBC, DES) subsistent dans data-ciphers.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Chiffrement moderne (TLS 1.2+, AEAD sans suites faibles) validé.';
  }

  // 4. Push et profil client (push_and_client_profile)
  const hasPushRoute = /push\s+"route\s+192\.168\.10\.0\s+255\.255\.255\.0"/.test(serverActive);
  const hasPushDns = /push\s+"dhcp-option\s+DNS\s+\d+\.\d+\.\d+\.\d+"/.test(serverActive);
  const clientOk = /^client$/m.test(clientActive) && /remote\s+\S+\s+\d+/.test(clientActive) && /dev\s+tun/.test(clientActive);
  if (!hasPushRoute || !hasPushDns) {
    checks[3].message = 'Le serveur doit pousser la route 192.168.10.0 255.255.255.0 et un serveur DNS interne (push "dhcp-option DNS ...").';
  } else if (!clientOk) {
    checks[3].message = "Le profil client doit déclarer client, dev tun et remote <IP publique>:1194.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Routes et DNS poussés, profil client nomade complet.';
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

function hasTlsVersionMin(serverActive) {
  return /tls-version-min\s+1\.2/.test(serverActive);
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateOpenvpnNomade(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}