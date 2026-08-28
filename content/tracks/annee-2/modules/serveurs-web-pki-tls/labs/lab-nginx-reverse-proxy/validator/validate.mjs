#!/usr/bin/env node

/**
 * Validateur du lab "Reverse Proxy Nginx : Terminaison TLS et Répartition de Charge"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateNginxReverseProxy(workDir = '/work') {
  const proxyPath = join(workDir, 'nginx-proxy.conf');
  const upstreamPath = join(workDir, 'upstream-backends.conf');

  const checks = [
    { id: 'http_to_https_redirect', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'upstream_load_balancing', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'proxy_headers_transmission', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'proxy_pass_persistence', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(proxyPath) || !existsSync(upstreamPath)) {
    for (const c of checks) {
      c.message = 'Fichiers nginx-proxy.conf ou upstream-backends.conf introuvables dans le répertoire de travail.';
    }
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const proxy = readFileSync(proxyPath, 'utf-8');
  const upstream = readFileSync(upstreamPath, 'utf-8');

  // 1. Redirection HTTP -> HTTPS (http_to_https_redirect)
  const has80Block = /listen\s+80;/.test(proxy);
  const has301Redirect = /return\s+301\s+https:\/\//.test(proxy);
  if (!has80Block) {
    checks[0].message = "Le bloc server écoutant le port 80 est requis pour intercepter le trafic HTTP.";
  } else if (!has301Redirect) {
    checks[0].message = "Le trafic HTTP doit être redirigé en permanence : return 301 https://$host$request_uri;";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Redirection permanente HTTP vers HTTPS validée.';
  }

  // 2. Upstream et répartition (upstream_load_balancing)
  const hasUpstreamBlock = /upstream\s+opensio_backend\s*\{/.test(upstream);
  const hasLeastConn = /least_conn\s*;/.test(upstream);
  const backendCount = (upstream.match(/^\s*server\s+\d+\.\d+\.\d+\.\d+:\d+/gm) || []).length;
  const hasFailDetection = /max_fails=\d+\s+fail_timeout=\d+s/.test(upstream);
  if (!hasUpstreamBlock) {
    checks[1].message = "Le bloc 'upstream opensio_backend { ... }' est requis dans upstream-backends.conf.";
  } else if (!hasLeastConn) {
    checks[1].message = "La stratégie de répartition 'least_conn;' doit être déclarée dans l'upstream.";
  } else if (backendCount < 2) {
    checks[1].message = "Au moins deux lignes 'server IP:8080 ...' sont requises pour la répartition de charge.";
  } else if (!hasFailDetection) {
    checks[1].message = "Chaque backend doit porter max_fails=3 fail_timeout=30s pour la détection de panne.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Upstream least_conn avec backends et détection de panne validés.';
  }

  // 3. Transmission des en-têtes client (proxy_headers_transmission)
  const hasHost = /proxy_set_header\s+Host\s+\$host\s*;/.test(proxy);
  const hasRealIp = /proxy_set_header\s+X-Real-IP\s+\$remote_addr\s*;/.test(proxy);
  const hasXff = /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for\s*;/.test(proxy);
  const hasXfp = /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme\s*;/.test(proxy);
  if (!hasHost) {
    checks[2].message = "L'en-tête Host doit être transmis : proxy_set_header Host $host;";
  } else if (!hasRealIp) {
    checks[2].message = "L'IP réelle du client doit être transmise : proxy_set_header X-Real-IP $remote_addr;";
  } else if (!hasXff) {
    checks[2].message = "La chaîne des IP clientes doit être transmise : proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;";
  } else if (!hasXfp) {
    checks[2].message = "Le schéma d'origine doit être transmis : proxy_set_header X-Forwarded-Proto $scheme;";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'En-têtes client (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto) transmis.';
  }

  // 4. proxy_pass et persistance (proxy_pass_persistence)
  const hasProxyPass = /proxy_pass\s+http:\/\/opensio_backend\s*;/.test(proxy);
  const hasHttp11 = /proxy_http_version\s+1\.1\s*;/.test(proxy);
  const hasConnEmpty = /proxy_set_header\s+Connection\s+""\s*;/.test(proxy);
  if (!hasProxyPass) {
    checks[3].message = "Le relais 'proxy_pass http://opensio_backend;' est requis dans le bloc location.";
  } else if (!hasHttp11 || !hasConnEmpty) {
    checks[3].message = "Les connexions persistantes exigent proxy_http_version 1.1; et proxy_set_header Connection \"\";";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Relais proxy_pass vers l\u2019upstream avec persistance HTTP/1.1 validés.';
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
  const verdict = validateNginxReverseProxy(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}