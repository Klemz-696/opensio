#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement et configuration d'un serveur DHCP moderne ISC Kea"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateKea(workDir = '/work') {
  const confPath = join(workDir, 'kea-dhcp4.conf');

  const checks = [
    { id: 'json_structure_and_globals_valid', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'subnet_and_pool_valid', passed: false, points: 0, maxPoints: 40, message: '' },
    { id: 'options_and_reservation_valid', passed: false, points: 0, maxPoints: 30, message: '' },
  ];

  if (!existsSync(confPath)) {
    checks[0].message = 'Fichier kea-dhcp4.conf introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  let config;
  try {
    const rawContent = readFileSync(confPath, 'utf-8');
    config = JSON.parse(rawContent);
  } catch (err) {
    checks[0].message = `Erreur de syntaxe JSON dans kea-dhcp4.conf : ${err.message}`;
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const dhcp4 = config.Dhcp4;
  if (!dhcp4) {
    checks[0].message = "Objet racine 'Dhcp4' manquant dans la configuration JSON.";
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  // 1. Contrôle des paramètres globaux et interfaces (json_structure_and_globals_valid)
  let globalsValid = true;
  const globalErrors = [];

  const interfaces = dhcp4['interfaces-config']?.interfaces || [];
  if (!interfaces.includes('eth0')) {
    globalsValid = false;
    globalErrors.push("L'interface 'eth0' doit être déclarée dans 'interfaces-config.interfaces'.");
  }

  const leaseDb = dhcp4['lease-database'];
  if (!leaseDb || leaseDb.type !== 'memfile') {
    globalsValid = false;
    globalErrors.push("La base 'lease-database' doit être configurée avec type='memfile'.");
  }

  if (dhcp4['valid-lifetime'] !== 86400) {
    globalsValid = false;
    globalErrors.push(`'valid-lifetime' doit valoir 86400 (reçu : ${dhcp4['valid-lifetime']}).`);
  }

  if (globalsValid) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = "Structure JSON valide, interface 'eth0', base de baux memfile et timers globaux validés.";
  } else {
    checks[0].message = globalErrors.join(' ');
  }

  // 2. Contrôle du sous-réseau et de la plage d'adresses (subnet_and_pool_valid)
  let subnetValid = true;
  const subnetErrors = [];

  const subnets = dhcp4.subnet4 || [];
  const targetSubnet = subnets.find((s) => s.subnet === '192.168.20.0/24');

  if (!targetSubnet) {
    subnetValid = false;
    subnetErrors.push("Sous-réseau '192.168.20.0/24' introuvable dans 'subnet4'.");
  } else {
    const pools = targetSubnet.pools || [];
    const hasValidPool = pools.some((p) => {
      const pStr = p.pool ? p.pool.replace(/\s+/g, '') : '';
      return pStr === '192.168.20.50-192.168.20.200';
    });

    if (!hasValidPool) {
      subnetValid = false;
      subnetErrors.push("Plage d'adresses dynamiques '192.168.20.50 - 192.168.20.200' manquante ou erronée dans les pools.");
    }
  }

  if (subnetValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Sous-réseau '192.168.20.0/24' et pool d'adresses dynamiques (50-200) parfaitement configurés.";
  } else {
    checks[1].message = subnetErrors.join(' ');
  }

  // 3. Contrôle des options DHCP et de la réservation statique (options_and_reservation_valid)
  let optionsValid = true;
  const optionErrors = [];

  if (targetSubnet) {
    const options = targetSubnet['option-data'] || [];

    const routersOpt = options.find((o) => o.name === 'routers');
    if (!routersOpt || routersOpt.data !== '192.168.20.254') {
      optionsValid = false;
      optionErrors.push("Option 'routers' doit être définie à '192.168.20.254'.");
    }

    const dnsOpt = options.find((o) => o.name === 'domain-name-servers');
    if (!dnsOpt || !dnsOpt.data.includes('192.168.20.10')) {
      optionsValid = false;
      optionErrors.push("Option 'domain-name-servers' doit contenir '192.168.20.10'.");
    }

    const domainOpt = options.find((o) => o.name === 'domain-name');
    if (!domainOpt || domainOpt.data !== 'prod.entreprise.lan') {
      optionsValid = false;
      optionErrors.push("Option 'domain-name' doit être 'prod.entreprise.lan'.");
    }

    const reservations = targetSubnet.reservations || [];
    const nasRes = reservations.find((r) => {
      const mac = (r['hw-address'] || '').toLowerCase();
      return mac === '00:11:22:33:44:55' && r['ip-address'] === '192.168.20.15';
    });

    if (!nasRes) {
      optionsValid = false;
      optionErrors.push("Réservation statique pour MAC '00:11:22:33:44:55' vers '192.168.20.15' manquante ou incorrecte.");
    }
  } else {
    optionsValid = false;
  }

  if (optionsValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = "Options DHCP (passerelle, DNS, domaine prod.entreprise.lan) et réservation MAC nas validées.";
  } else {
    checks[2].message = optionErrors.join(' ');
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
  const verdict = validateKea(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
