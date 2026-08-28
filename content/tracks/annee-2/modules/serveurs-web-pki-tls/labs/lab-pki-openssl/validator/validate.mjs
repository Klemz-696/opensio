#!/usr/bin/env node

/**
 * Validateur du lab "CA Racine d'Entreprise et Certificat SAN Multi-Domaines avec OpenSSL"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePkiOpenssl(workDir = '/work') {
  const scriptPath = join(workDir, 'generate-pki.sh');
  const sanPath = join(workDir, 'openssl-san.cnf');

  const checks = [
    { id: 'ca_key_and_certificate', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'server_key_and_csr', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'san_multi_domain', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'server_cert_signature', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(scriptPath) || !existsSync(sanPath)) {
    for (const c of checks) {
      c.message = 'Fichiers generate-pki.sh ou openssl-san.cnf introuvables dans le répertoire de travail.';
    }
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const script = readFileSync(scriptPath, 'utf-8');
  const san = readFileSync(sanPath, 'utf-8');

  // 1. CA racine : clé chiffrée 4096 + certificat auto-signé 10 ans CA:TRUE
  const hasCaKey = /genrsa\s+[^#]*-aes256/.test(script) && /genrsa\s+[^#]*4096/.test(script);
  const hasCaCert = /req\s+[^#]*-x509/.test(script);
  const hasCaDays = /-days\s+3650\b/.test(script);
  const hasCaTrue = /basicConstraints[^#\n]*CA:TRUE/.test(script);
  if (!hasCaKey) {
    checks[0].message = "La clé de la CA racine doit être chiffrée (-aes256) et de taille 4096 bits.";
  } else if (!hasCaCert) {
    checks[0].message = "Le certificat auto-signé de la CA doit être émis avec 'openssl req -x509'.";
  } else if (!hasCaDays || !hasCaTrue) {
    checks[0].message = "La CA racine exige une validité longue (3650 jours) et la contrainte basicConstraints CA:TRUE.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'CA racine : clé AES-256 4096 bits, certificat X.509 10 ans CA:TRUE validés.';
  }

  // 2. Clé serveur + CSR
  const hasServerKey = /genrsa\s+-out\s+\S*opensio[^#\n]*\.key\s+2048/.test(script);
  const hasCsr = /req\s+-new\s+-key\s+\S*opensio[^#\n]*\.key\s*\n?\s*[^#]*-out\s+\S*opensio[^#\n]*\.csr/.test(script);
  if (!hasServerKey) {
    checks[1].message = "La clé du serveur doit être générée en 2048 bits (openssl genrsa -out opensio.home.lan.key 2048).";
  } else if (!hasCsr) {
    checks[1].message = "La requête de signature (CSR) doit être créée : openssl req -new -key opensio.home.lan.key -out opensio.home.lan.csr.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Clé serveur 2048 bits et CSR générées.';
  }

  // 3. Extensions serveur + SAN multi-domaines
  const hasCaFalse = /basicConstraints\s*=\s*CA:FALSE/.test(san);
  const hasServerAuth = /extendedKeyUsage\s*=\s*serverAuth/.test(san);
  const dnsNames = (san.match(/^\s*DNS\.\d+\s*=\s*\S+/gm) || []).length;
  if (!hasCaFalse) {
    checks[2].message = "Le certificat serveur doit porter basicConstraints = CA:FALSE.";
  } else if (!hasServerAuth) {
    checks[2].message = "L'usage étendu 'extendedKeyUsage = serverAuth' est requis.";
  } else if (dnsNames < 2) {
    checks[2].message = "Le SAN doit couvrir au moins deux noms (DNS.1 = opensio.home.lan, DNS.2 = www.home.lan).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Extensions serveur et SAN multi-domaines validés.';
  }

  // 4. Signature du certificat serveur par la CA (sha256, 825 jours max, extfile)
  const scriptLines = script.split('\n');
  const signIdx = scriptLines.findIndex((l) => /openssl\s+x509\s+-req/.test(l));
  let signBlock = '';
  if (signIdx >= 0) {
    const collected = [];
    for (let i = signIdx; i < scriptLines.length; i++) {
      collected.push(scriptLines[i]);
      if (!/\\\s*$/.test(scriptLines[i])) break; // fin de la commande (pas de continuation \)
    }
    signBlock = collected.join('\n');
  }
  const hasX509Sign = signIdx >= 0;
  const hasCaOption = /-CA\s+ca-racine\.pem/.test(signBlock) && /-CAkey\s+ca-racine\.key/.test(signBlock);
  const hasSha256 = /-sha256/.test(signBlock);
  const daysMatch = signBlock.match(/-days\s+(\d+)/);
  const hasShortValidity = daysMatch !== null && Number(daysMatch[1]) <= 825;
  const hasExtfile = /-extfile\s+openssl-san\.cnf/.test(signBlock);
  if (!hasX509Sign || !hasCaOption) {
    checks[3].message = "Le certificat serveur doit être signé avec 'openssl x509 -req -CA ca-racine.pem -CAkey ca-racine.key'.";
  } else if (!hasSha256) {
    checks[3].message = "La signature doit utiliser SHA-256 (-sha256).";
  } else if (!hasShortValidity) {
    checks[3].message = "La validité du certificat serveur doit rester courte (825 jours maximum, pas plusieurs années).";
  } else if (!hasExtfile) {
    checks[3].message = "Les extensions SAN doivent être injectées via -extfile openssl-san.cnf.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Certificat serveur signé par la CA racine (SHA-256, validité courte, SAN appliqué).';
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
  const verdict = validatePkiOpenssl(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}