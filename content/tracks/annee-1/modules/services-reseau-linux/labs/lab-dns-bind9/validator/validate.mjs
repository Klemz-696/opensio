#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement et sécurisation d'un serveur DNS Bind9 faisant autorité"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateBind9(workDir = '/work') {
  const confPath = join(workDir, 'named.conf.local');
  const forwardPath = join(workDir, 'db.societe.lan');
  const reversePath = join(workDir, 'db.192.168.10');

  const checks = [
    { id: 'zone_declarations_valid', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'forward_records_valid', passed: false, points: 0, maxPoints: 45, message: '' },
    { id: 'reverse_records_valid', passed: false, points: 0, maxPoints: 30, message: '' },
  ];

  if (!existsSync(confPath) || !existsSync(forwardPath) || !existsSync(reversePath)) {
    checks[0].message = 'Un ou plusieurs fichiers requis (named.conf.local, db.societe.lan, db.192.168.10) sont introuvables.';
    checks[1].message = 'Validation impossible : fichiers absents.';
    checks[2].message = 'Validation impossible : fichiers absents.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawConf = readFileSync(confPath, 'utf-8');
  const rawForward = readFileSync(forwardPath, 'utf-8');
  const rawReverse = readFileSync(reversePath, 'utf-8');

  // 1. Contrôle de named.conf.local (zone_declarations_valid)
  let confValid = true;
  const confErrors = [];

  const forwardZoneMatch = /zone\s+"societe\.lan"\s*\{[^}]*type\s+master;[^}]*file\s+"[^"]*db\.societe\.lan";?[^}]*\}/is.test(rawConf);
  const reverseZoneMatch = /zone\s+"10\.168\.192\.in-addr\.arpa"\s*\{[^}]*type\s+master;[^}]*file\s+"[^"]*db\.192\.168\.10";?[^}]*\}/is.test(rawConf);

  if (!forwardZoneMatch) {
    confValid = false;
    confErrors.push("Déclaration de la zone 'societe.lan' (type master, fichier db.societe.lan) invalide ou manquante dans named.conf.local.");
  }

  if (!reverseZoneMatch) {
    confValid = false;
    confErrors.push("Déclaration de la zone inverse '10.168.192.in-addr.arpa' (type master, fichier db.192.168.10) invalide ou manquante dans named.conf.local.");
  }

  if (confValid) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = "Zones directe ('societe.lan') et inverse ('10.168.192.in-addr.arpa') correctement déclarées en type master.";
  } else {
    checks[0].message = confErrors.join(' ');
  }

  // 2. Contrôle de la zone directe db.societe.lan (forward_records_valid)
  let forwardValid = true;
  const forwardErrors = [];

  // SOA
  const soaMatch = /SOA\s+ns1\.societe\.lan\.\s+admin\.societe\.lan\.\s*\(\s*(\d+)/i.exec(rawForward);
  if (!soaMatch) {
    forwardValid = false;
    forwardErrors.push("En-tête SOA manquant ou incorrect (serveur maître attendu : ns1.societe.lan., contact : admin.societe.lan.).");
  } else {
    const serial = soaMatch[1];
    if (serial.length < 8) {
      forwardValid = false;
      forwardErrors.push(`Numéro de série SOA (${serial}) non conforme au format recommandé YYYYMMDDNN.`);
    }
  }

  // NS
  if (!/IN\s+NS\s+ns1\.societe\.lan\./i.test(rawForward) || !/IN\s+NS\s+ns2\.societe\.lan\./i.test(rawForward)) {
    forwardValid = false;
    forwardErrors.push("Serveurs de noms NS 'ns1.societe.lan.' et/ou 'ns2.societe.lan.' manquants.");
  }

  // MX
  if (!/IN\s+MX\s+10\s+mail\.societe\.lan\./i.test(rawForward)) {
    forwardValid = false;
    forwardErrors.push("Enregistrement MX '10 mail.societe.lan.' manquant.");
  }

  // A records
  const expectedA = [
    { host: 'ns1', ip: '192.168.10.10' },
    { host: 'ns2', ip: '192.168.10.11' },
    { host: 'mail', ip: '192.168.10.15' },
    { host: 'srv-web', ip: '192.168.10.20' },
    { host: 'srv-db', ip: '192.168.10.30' },
  ];

  for (const { host, ip } of expectedA) {
    const regex = new RegExp(`(^|\\s)${host}(\\.societe\\.lan\\.)?\\s+(IN\\s+)?A\\s+${ip}`, 'im');
    if (!regex.test(rawForward)) {
      forwardValid = false;
      forwardErrors.push(`Enregistrement A manquant pour ${host} -> ${ip}.`);
    }
  }

  // CNAME records (doivent avoir le point final)
  const expectedCname = ['www', 'intranet'];
  for (const alias of expectedCname) {
    const regex = new RegExp(`(^|\\s)${alias}(\\.societe\\.lan\\.)?\\s+(IN\\s+)?CNAME\\s+srv-web\\.societe\\.lan\\.`, 'im');
    if (!regex.test(rawForward)) {
      forwardValid = false;
      forwardErrors.push(`Alias CNAME manquant pour ${alias} -> srv-web.societe.lan.`);
    }
  }

  if (forwardValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Zone directe validée : SOA formaté, NS1/NS2, MX, 5 hôtes A et alias CNAME (www, intranet) conformes avec points terminaux.";
  } else {
    checks[1].message = forwardErrors.join(' ');
  }

  // 3. Contrôle de la zone inverse db.192.168.10 (reverse_records_valid)
  let reverseValid = true;
  const reverseErrors = [];

  if (!/IN\s+NS\s+ns1\.societe\.lan\./i.test(rawReverse)) {
    reverseValid = false;
    reverseErrors.push("Serveur de nom NS 'ns1.societe.lan.' manquant dans la zone inverse.");
  }

  const expectedPtr = [
    { octet: '10', fqdn: 'ns1.societe.lan.' },
    { octet: '11', fqdn: 'ns2.societe.lan.' },
    { octet: '15', fqdn: 'mail.societe.lan.' },
    { octet: '20', fqdn: 'srv-web.societe.lan.' },
    { octet: '30', fqdn: 'srv-db.societe.lan.' },
  ];

  for (const { octet, fqdn } of expectedPtr) {
    const escapedFqdn = fqdn.replace(/\./g, '\\.');
    const regex = new RegExp(`(^|\\s)${octet}(\\.10\\.168\\.192\\.in-addr\\.arpa\\.)?\\s+(IN\\s+)?PTR\\s+${escapedFqdn}`, 'im');
    if (!regex.test(rawReverse)) {
      reverseValid = false;
      reverseErrors.push(`Pointeur PTR manquant pour ${octet} -> ${fqdn}.`);
    }
  }

  if (reverseValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = "Zone inverse validée : pointeurs PTR (10, 11, 15, 20, 30) rigoureusement réciproques avec la zone directe.";
  } else {
    checks[2].message = reverseErrors.join(' ');
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
  const verdict = validateBind9(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
