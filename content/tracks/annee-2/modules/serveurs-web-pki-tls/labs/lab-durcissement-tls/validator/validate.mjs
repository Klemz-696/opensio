#!/usr/bin/env node

/**
 * Validateur du lab "Durcissement TLS d'un Serveur Web Vulnérable"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateTlsHardening(workDir = '/work') {
  const tlsPath = join(workDir, 'nginx-tls.conf');
  const headersPath = join(workDir, 'security-headers.conf');

  const checks = [
    { id: 'tls_protocols_hardened', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'cipher_suites_strong', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'security_headers_present', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'https_redirect_and_stapling', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(tlsPath) || !existsSync(headersPath)) {
    for (const c of checks) {
      c.message = 'Fichiers nginx-tls.conf ou security-headers.conf introuvables dans le répertoire de travail.';
    }
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const tls = readFileSync(tlsPath, 'utf-8');
  const headers = readFileSync(headersPath, 'utf-8');

  // 1. Protocoles restreints (tls_protocols_hardened)
  const protocolsLine = tls.match(/ssl_protocols\s+([^;]+);/);
  const protocols = protocolsLine ? protocolsLine[1] : '';
  const hasModern = /TLSv1\.2/.test(protocols) && /TLSv1\.3/.test(protocols);
  const hasLegacyElsewhere = /(SSLv3|TLSv1\b(?!\.2|\.3)|TLSv1\.1)/.test(tls.replace(/^\s*#.*$/gm, ''));
  if (!protocolsLine) {
    checks[0].message = "La directive ssl_protocols doit être déclarée (TLSv1.2 TLSv1.3).";
  } else if (!hasModern) {
    checks[0].message = "Les protocoles autorisés doivent être exactement TLSv1.2 et TLSv1.3.";
  } else if (hasLegacyElsewhere) {
    checks[0].message = "Une mention de protocole obsolète (SSLv3, TLSv1, TLSv1.1) subsiste dans la configuration.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Protocoles restreints à TLS 1.2/1.3, protocoles obsolètes éliminés.';
  }

  // 2. Suites de chiffrement fortes (cipher_suites_strong)
  const ciphersLine = tls.match(/ssl_ciphers\s+([^;]+);/);
  const ciphers = ciphersLine ? ciphersLine[1] : '';
  const hasEcdhe = /ECDHE/.test(ciphers);
  const hasAead = /(GCM|CHACHA20)/.test(ciphers);
  const hasWeak = /(RC4|3DES|DES-CBC|MD5)(?![^\w-])/.test(ciphers);
  if (!ciphersLine) {
    checks[1].message = "La directive ssl_ciphers doit définir explicitement les suites autorisées.";
  } else if (!hasEcdhe || !hasAead) {
    checks[1].message = "Les suites doivent combiner ECDHE (PFS) et un chiffrement AEAD (AES-GCM ou CHACHA20-POLY1305).";
  } else if (hasWeak) {
    checks[1].message = "Des suites faibles (RC4, 3DES, DES-CBC, MD5) subsistent dans ssl_ciphers.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Suites de chiffrement ECDHE + AEAD validées, suites faibles exclues.';
  }

  // 3. En-têtes de sécurité (security_headers_present)
  const hsts = headers.match(/Strict-Transport-Security\s+"([^"]+)"/);
  const hstsMaxAge = hsts ? Number((hsts[1].match(/max-age=(\d+)/) || [])[1] || 0) : 0;
  const hasIncludeSub = hsts ? /includeSubDomains/.test(hsts[1]) : false;
  const hasNosniff = /X-Content-Type-Options\s+"?nosniff"?/.test(headers);
  const hasFrameDeny = /X-Frame-Options\s+"?DENY"?/.test(headers);
  if (!hsts) {
    checks[2].message = "L'en-tête Strict-Transport-Security est requis (max-age=31536000; includeSubDomains).";
  } else if (hstsMaxAge < 15768000) {
    checks[2].message = "Le max-age HSTS doit être d'au moins 6 mois (31536000 = 1 an recommandé).";
  } else if (!hasIncludeSub) {
    checks[2].message = "La directive includeSubDomains doit accompagner le max-age HSTS.";
  } else if (!hasNosniff || !hasFrameDeny) {
    checks[2].message = "Les en-têtes X-Content-Type-Options: nosniff et X-Frame-Options: DENY sont requis.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'HSTS long terme, nosniff et anti-clickjacking déployés.';
  }

  // 4. Redirection HTTPS et OCSP stapling (https_redirect_and_stapling)
  const hasRedirect = /return\s+301\s+https:\/\//.test(tls) && /listen\s+80;/.test(tls);
  const hasStapling = /ssl_stapling\s+on\s*;/.test(tls) && /ssl_stapling_verify\s+on\s*;/.test(tls);
  const hasTicketsOff = /ssl_session_tickets\s+off\s*;/.test(tls);
  if (!hasRedirect) {
    checks[3].message = "Le port 80 doit rediriger en permanence : server { listen 80; ... return 301 https://$host$request_uri; }";
  } else if (!hasStapling) {
    checks[3].message = "L'agrafage OCSP est requis : ssl_stapling on; ssl_stapling_verify on;";
  } else if (!hasTicketsOff) {
    checks[3].message = "Les tickets de session doivent être désactivés : ssl_session_tickets off;";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Redirection HTTPS permanente et OCSP stapling activés.';
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
  const verdict = validateTlsHardening(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}