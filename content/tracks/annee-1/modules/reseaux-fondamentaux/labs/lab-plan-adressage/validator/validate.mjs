#!/usr/bin/env node

/**
 * Validateur du lab "Plan d'adressage d'une PME" (Niveau 2 - Fichiers)
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function ipToInt(ipStr) {
  const parts = ipStr.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function intToIp(intVal) {
  return [
    (intVal >>> 24) & 255,
    (intVal >>> 16) & 255,
    (intVal >>> 8) & 255,
    intVal & 255,
  ].join('.');
}

export function validatePlanCsv(workDir = '/work') {
  const csvPath = join(workDir, 'plan.csv');

  const checks = [
    { id: 'subnets_valid', passed: false, points: 0, maxPoints: 60, message: '' },
    { id: 'no_overlap', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'doc_complete', passed: false, points: 0, maxPoints: 15, message: '' },
  ];

  if (!existsSync(csvPath)) {
    checks[0].message = 'Fichier plan.csv introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(csvPath, 'utf-8');
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    checks[0].message = 'Le fichier plan.csv est vide ou ne comporte pas de données.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  // Parser les lignes CSV
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const expectedServices = {
    production: { minHosts: 50, requiredPrefix: 26 },
    invites: { minHosts: 20, requiredPrefix: 27 },
    comptabilite: { minHosts: 10, requiredPrefix: 28 },
  };

  const parsedEntries = new Map();
  const baseNetInt = ipToInt('10.20.0.0');
  const baseBroadcastInt = ipToInt('10.20.0.255');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 7) continue;

    const rawService = cols[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const network = cols[1];
    const prefixStr = cols[2].replace('/', '');
    const gateway = cols[3];
    const firstHost = cols[4];
    const lastHost = cols[5];
    const broadcast = cols[6];

    parsedEntries.set(rawService, {
      service: cols[0],
      network,
      prefix: parseInt(prefixStr, 10),
      gateway,
      firstHost,
      lastHost,
      broadcast,
    });
  }

  // 1. Vérification du découpage VLSM (subnets_valid)
  let subnetsValid = true;
  const subnetsErrors = [];

  for (const [srvKey, rules] of Object.entries(expectedServices)) {
    const entry = parsedEntries.get(srvKey);
    if (!entry) {
      subnetsValid = false;
      subnetsErrors.push(`Service ${srvKey} manquant.`);
      continue;
    }

    if (isNaN(entry.prefix) || entry.prefix > rules.requiredPrefix) {
      subnetsValid = false;
      subnetsErrors.push(
        `${entry.service} : le préfixe /${entry.prefix} ne permet pas d'accueillir ${rules.minHosts} hôtes (requis : /${rules.requiredPrefix}).`
      );
      continue;
    }

    const netInt = ipToInt(entry.network);
    if (netInt === null || netInt < baseNetInt || netInt > baseBroadcastInt) {
      subnetsValid = false;
      subnetsErrors.push(`${entry.service} : l'adresse réseau ${entry.network} est hors du bloc 10.20.0.0/24.`);
      continue;
    }

    // Vérifier que l'adresse réseau est bien alignée sur le masque
    const mask = ((0xffffffff << (32 - entry.prefix)) >>> 0);
    if ((netInt & mask) !== netInt) {
      subnetsValid = false;
      subnetsErrors.push(`${entry.service} : ${entry.network} n'est pas une adresse réseau valide pour un /${entry.prefix}.`);
    }
  }

  if (subnetsValid && subnetsErrors.length === 0) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Découpage VLSM correct et adapté aux besoins de chaque service.';
  } else {
    checks[0].message = subnetsErrors.join(' ');
  }

  // 2. Vérification des chevauchements (no_overlap)
  const ranges = [];
  let overlapFound = false;
  const overlapErrors = [];

  for (const [srvKey] of Object.entries(expectedServices)) {
    const entry = parsedEntries.get(srvKey);
    if (!entry || isNaN(entry.prefix)) continue;

    const netInt = ipToInt(entry.network);
    if (netInt === null) continue;

    const blockSize = Math.pow(2, 32 - entry.prefix);
    const bcastInt = netInt + blockSize - 1;

    ranges.push({
      service: entry.service,
      start: netInt,
      end: bcastInt,
    });
  }

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const r1 = ranges[i];
      const r2 = ranges[j];
      if (Math.max(r1.start, r2.start) <= Math.min(r1.end, r2.end)) {
        overlapFound = true;
        overlapErrors.push(`Chevauchement détecté entre ${r1.service} et ${r2.service}.`);
      }
    }
  }

  if (!overlapFound && ranges.length === 3) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Aucun chevauchement d\'adresses entre les sous-réseaux.';
  } else {
    checks[1].message = overlapErrors.length > 0 ? overlapErrors.join(' ') : 'Sous-réseaux incomplets ou invalides.';
  }

  // 3. Vérification de la complétude et cohérence (doc_complete)
  let docComplete = true;
  const docErrors = [];

  for (const [srvKey] of Object.entries(expectedServices)) {
    const entry = parsedEntries.get(srvKey);
    if (!entry || isNaN(entry.prefix)) {
      docComplete = false;
      continue;
    }

    const netInt = ipToInt(entry.network);
    if (netInt === null) {
      docComplete = false;
      continue;
    }

    const blockSize = Math.pow(2, 32 - entry.prefix);
    const expectedBcastInt = netInt + blockSize - 1;
    const expectedFirstInt = netInt + 1;
    const expectedLastInt = expectedBcastInt - 1;

    const gwInt = ipToInt(entry.gateway);
    const firstInt = ipToInt(entry.firstHost);
    const lastInt = ipToInt(entry.lastHost);
    const bcastInt = ipToInt(entry.broadcast);

    if (firstInt !== expectedFirstInt) {
      docComplete = false;
      docErrors.push(`${entry.service} : 1ère adresse hôte incorrecte (${entry.firstHost} au lieu de ${intToIp(expectedFirstInt)}).`);
    }
    if (lastInt !== expectedLastInt) {
      docComplete = false;
      docErrors.push(`${entry.service} : dernière adresse hôte incorrecte (${entry.lastHost} au lieu de ${intToIp(expectedLastInt)}).`);
    }
    if (bcastInt !== expectedBcastInt) {
      docComplete = false;
      docErrors.push(`${entry.service} : broadcast incorrect (${entry.broadcast} au lieu de ${intToIp(expectedBcastInt)}).`);
    }
    if (gwInt === null || gwInt < expectedFirstInt || gwInt > expectedLastInt) {
      docComplete = false;
      docErrors.push(`${entry.service} : passerelle ${entry.gateway} invalide ou hors plage.`);
    }
  }

  if (docComplete && docErrors.length === 0) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Toutes les adresses (passerelle, 1ère, dernière, broadcast) sont cohérentes.';
  } else {
    checks[2].message = docErrors.join(' ');
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.filter((c) => c.id !== 'doc_complete').every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 85,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

// Exécution directe CLI
if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validatePlanCsv(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
