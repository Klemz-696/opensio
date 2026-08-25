#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement d'une maquette de services réseau DNS et DHCP"
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateDnsmasqConf(workDir = '/work') {
  const confPath = join(workDir, 'dnsmasq.conf');

  const checks = [
    { id: 'dns_config_valid', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'dhcp_scope_valid', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'dhcp_options_valid', passed: false, points: 0, maxPoints: 20, message: '' },
    { id: 'static_reservation_valid', passed: false, points: 0, maxPoints: 10, message: '' },
  ];

  if (!existsSync(confPath)) {
    checks[0].message = 'Fichier dnsmasq.conf introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(confPath, 'utf-8');
  const normalized = rawContent
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');

  // 1. Vérification DNS (dns_config_valid)
  const hasDomain = /domain\s*=\s*agence\.local\b/.test(normalized);
  const hasSrvApp = (
    (/address\s*=\s*\/srv-app\.agence\.local\/192\.168\.50\.10\b/.test(normalized) ||
      /host-record\s*=\s*srv-app\.agence\.local\s*,\s*192\.168\.50\.10\b/.test(normalized) ||
      /host-record\s*=\s*srv-app\s*,\s*192\.168\.50\.10\b/.test(normalized))
  );
  const hasGw = (
    (/address\s*=\s*\/gw\.agence\.local\/192\.168\.50\.254\b/.test(normalized) ||
      /host-record\s*=\s*gw\.agence\.local\s*,\s*192\.168\.50\.254\b/.test(normalized) ||
      /host-record\s*=\s*gw\s*,\s*192\.168\.50\.254\b/.test(normalized))
  );

  if (hasDomain && hasSrvApp && hasGw) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Zone DNS locale agence.local et enregistrements statiques (srv-app, gw) conformes.';
  } else {
    const missing = [];
    if (!hasDomain) missing.push('domain=agence.local');
    if (!hasSrvApp) missing.push('hôte statique srv-app -> 192.168.50.10');
    if (!hasGw) missing.push('hôte statique gw -> 192.168.50.254');
    checks[0].message = `Configuration DNS incomplète : ${missing.join(', ')}.`;
  }

  // 2. Vérification DHCP Scope (dhcp_scope_valid)
  const hasDhcpRange = /dhcp-range\s*=\s*192\.168\.50\.100\s*,\s*192\.168\.50\.200(\s*,\s*255\.255\.255\.0)?(\s*,\s*(12h|24h|43200|86400))?/.test(normalized);

  if (hasDhcpRange) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Étendue DHCP dynamique 192.168.50.100 à 192.168.50.200 (/24) correctement configurée.';
  } else {
    checks[1].message = 'Directive dhcp-range invalide ou plage d\'adresses 192.168.50.100-200 non conforme.';
  }

  // 3. Vérification des options DHCP (dhcp_options_valid)
  const hasOptRouter = (
    /dhcp-option\s*=\s*(3|option:router)\s*,\s*192\.168\.50\.254\b/.test(normalized)
  );
  const hasOptDns = (
    /dhcp-option\s*=\s*(6|option:dns-server)\s*,\s*192\.168\.50\.254\b/.test(normalized)
  );
  const hasOptDomain = (
    /dhcp-option\s*=\s*(15|option:domain-name)\s*,\s*agence\.local\b/.test(normalized) || hasDomain
  );

  if (hasOptRouter && hasOptDns && hasOptDomain) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Options DHCP 3 (Passerelle), 6 (Serveur DNS) et 15 (Domaine) distribuées.';
  } else {
    const missing = [];
    if (!hasOptRouter) missing.push('Option 3 (Passerelle 192.168.50.254)');
    if (!hasOptDns) missing.push('Option 6 (DNS 192.168.50.254)');
    if (!hasOptDomain) missing.push('Option 15 (Domaine agence.local)');
    checks[2].message = `Options DHCP manquantes : ${missing.join(', ')}.`;
  }

  // 4. Vérification de la réservation statique (static_reservation_valid)
  const hasStaticHost = (
    /dhcp-host\s*=\s*00:11:22:33:44:55\s*,\s*([a-z0-9-_]+\s*,\s*)?192\.168\.50\.20\b/.test(normalized) ||
    /dhcp-host\s*=\s*00:11:22:33:44:55\s*,\s*192\.168\.50\.20\b/.test(normalized)
  );

  if (hasStaticHost) {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Réservation DHCP statique pour l\'imprimante (MAC 00:11:22:33:44:55 -> 192.168.50.20) opérationnelle.';
  } else {
    checks[3].message = 'Réservation statique dhcp-host pour l\'imprimante (00:11:22:33:44:55 -> 192.168.50.20) manquante.';
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.filter((c) => c.id !== 'static_reservation_valid').every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateDnsmasqConf(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
