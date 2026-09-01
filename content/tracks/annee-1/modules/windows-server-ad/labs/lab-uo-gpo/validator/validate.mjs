#!/usr/bin/env node

/**
 * Validateur du lab "Conception de l'arborescence des UO et liaison des stratégies de groupe (GPO)"
 * Conforme au contrat de validation OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function parseCsvLine(line) {
  const matches = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      matches.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  matches.push(current.trim());

  if (matches.length === 5) {
    return matches;
  }

  // Fallback pour CSV non quoté avec virgules dans le Distinguished Name (DN)
  const rawParts = line.split(',').map((s) => s.trim());
  if (rawParts.length >= 5) {
    const blocked = rawParts[rawParts.length - 1];
    const enforced = rawParts[rawParts.length - 2];
    const gpo = rawParts[rawParts.length - 3];
    const desc = rawParts[rawParts.length - 4];
    const path = rawParts.slice(0, rawParts.length - 4).join(',');
    return [path, desc, gpo, enforced, blocked];
  }
  return [];
}

export function validateUoStructure(workDir = '/work') {
  const csvPath = join(workDir, 'structure-uo.csv');

  const checks = [
    { id: 'ou_hierarchy_valid', passed: false, points: 0, maxPoints: 40, message: '' },
    { id: 'gpo_links_valid', passed: false, points: 0, maxPoints: 40, message: '' },
    { id: 'inheritance_enforced_valid', passed: false, points: 0, maxPoints: 20, message: '' },
  ];

  if (!existsSync(csvPath)) {
    checks[0].message = 'Fichier structure-uo.csv introuvable dans le répertoire de travail.';
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
    checks[0].message = 'Le fichier structure-uo.csv est vide ou incomplet.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const expectedEntries = {
    'ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_securite_globale',
      enforced: false,
      blocked: false,
    },
    'ou=utilisateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_environnement_utilisateur',
      enforced: false,
      blocked: false,
    },
    'ou=direction,ou=utilisateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_direction_lecteurs',
      enforced: false,
      blocked: false,
    },
    'ou=comptabilite,ou=utilisateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_compta_lecteurs',
      enforced: false,
      blocked: false,
    },
    'ou=technique,ou=utilisateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_technique_lecteurs',
      enforced: false,
      blocked: false,
    },
    'ou=ordinateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_durcissement_postes',
      enforced: false,
      blocked: false,
    },
    'ou=portables,ou=ordinateurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_bitlocker_nomades',
      enforced: false,
      blocked: false,
    },
    'ou=serveurs,ou=entreprise,dc=entreprise,dc=lan': {
      gpo: 'gpo_securite_serveurs',
      enforced: true,
      blocked: true,
    },
  };

  const parsedEntries = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) continue;

    const rawPath = cols[0].toLowerCase().replace(/\s+/g, '').replace(/^"|"$/g, '');
    const gpo = cols[2].toLowerCase().replace(/\s+/g, '').replace(/^"|"$/g, '');
    const enforced = cols[3].toLowerCase().replace(/^"|"$/g, '') === 'true';
    const blocked = cols[4].toLowerCase().replace(/^"|"$/g, '') === 'true';

    parsedEntries.set(rawPath, {
      path: cols[0],
      description: cols[1],
      gpo,
      enforced,
      blocked,
    });
  }

  // 1. Vérification de la hiérarchie des UO (ou_hierarchy_valid)
  let hierarchyValid = true;
  const missingOUs = [];

  for (const expPath of Object.keys(expectedEntries)) {
    if (!parsedEntries.has(expPath)) {
      hierarchyValid = false;
      missingOUs.push(expPath);
    }
  }

  if (hierarchyValid && parsedEntries.size >= 8) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Arborescence des 8 Unités d\'Organisation complète et valide.';
  } else {
    checks[0].message = `Unités d'Organisation manquantes ou syntaxe DN incorrecte : ${missingOUs.join(' ; ')}.`;
  }

  // 2. Vérification des liaisons de GPO (gpo_links_valid)
  let gpoValid = true;
  const gpoErrors = [];

  for (const [expPath, rules] of Object.entries(expectedEntries)) {
    const entry = parsedEntries.get(expPath);
    if (!entry) {
      gpoValid = false;
      continue;
    }

    if (entry.gpo !== rules.gpo) {
      gpoValid = false;
      gpoErrors.push(`${entry.path} : GPO liée '${entry.gpo}' non conforme (attendu : '${rules.gpo}').`);
    }
  }

  if (gpoValid && hierarchyValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Toutes les liaisons de GPO sont conformes à l\'arborescence.';
  } else {
    checks[1].message = gpoErrors.length > 0 ? gpoErrors.join(' ') : 'Liaisons de GPO incomplètes.';
  }

  // 3. Vérification héritage et enforcement (inheritance_enforced_valid)
  const serverEntry = parsedEntries.get('ou=serveurs,ou=entreprise,dc=entreprise,dc=lan');
  if (serverEntry && serverEntry.blocked === true && serverEntry.enforced === true) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Blocage de l\'héritage et GPO Enforced sur l\'UO Serveurs correctement configurés.';
  } else {
    checks[2].message = 'L\'UO Serveurs doit avoir block_inheritance=true et gpo_enforced=true.';
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.filter((c) => c.id !== 'inheritance_enforced_valid').every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateUoStructure(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
