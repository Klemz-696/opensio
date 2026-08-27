#!/usr/bin/env node

/**
 * Validateur du lab "Rédaction et durcissement d'une unité de service systemd"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateSystemdUnit(workDir = '/work') {
  const servicePath = join(workDir, 'api-backend.service');

  const checks = [
    { id: 'unit_dependencies_valid', passed: false, points: 0, maxPoints: 30, message: '' },
    { id: 'service_execution_valid', passed: false, points: 0, maxPoints: 40, message: '' },
    { id: 'hardening_and_install_valid', passed: false, points: 0, maxPoints: 30, message: '' },
  ];

  if (!existsSync(servicePath)) {
    checks[0].message = 'Fichier api-backend.service introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(servicePath, 'utf-8');
  const lines = rawContent.split(/\r?\n/);

  const sections = {
    unit: new Map(),
    service: new Map(),
    install: new Map(),
  };

  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const secName = trimmed.slice(1, -1).toLowerCase();
      if (secName === 'unit' || secName === 'service' || secName === 'install') {
        currentSection = secName;
      } else {
        currentSection = null;
      }
      continue;
    }

    if (!currentSection) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      sections[currentSection].set(key, val);
    }
  }

  // 1. Contrôle de la section [Unit] (unit_dependencies_valid)
  let unitValid = true;
  const unitErrors = [];

  const afterVal = sections.unit.get('After') || '';
  const requiresVal = sections.unit.get('Requires') || '';

  if (!afterVal.includes('network.target') || !afterVal.includes('postgresql.service')) {
    unitValid = false;
    unitErrors.push("After doit inclure 'network.target' et 'postgresql.service'.");
  }

  if (!requiresVal.includes('postgresql.service')) {
    unitValid = false;
    unitErrors.push("Requires doit inclure 'postgresql.service'.");
  }

  if (!sections.unit.has('Description') || sections.unit.get('Description').length < 3) {
    unitValid = false;
    unitErrors.push('Description claire manquante dans [Unit].');
  }

  if (unitValid) {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Section [Unit] : Description et dépendances After/Requires vers PostgreSQL et le réseau conformes.';
  } else {
    checks[0].message = unitErrors.join(' ');
  }

  // 2. Contrôle de l'exécution dans [Service] (service_execution_valid)
  let execValid = true;
  const execErrors = [];

  const user = sections.service.get('User');
  const group = sections.service.get('Group');
  const execStart = sections.service.get('ExecStart') || '';
  const restart = sections.service.get('Restart');
  const workingDir = sections.service.get('WorkingDirectory');
  const envFile = sections.service.get('EnvironmentFile');

  if (user !== 'appuser' || group !== 'appuser') {
    execValid = false;
    execErrors.push(`User et Group doivent valoir 'appuser' (reçu User: ${user}, Group: ${group}).`);
  }

  if (!execStart.startsWith('/usr/bin/node') || !execStart.includes('/opt/api-backend/dist/main.js')) {
    execValid = false;
    execErrors.push("ExecStart doit utiliser le chemin absolu '/usr/bin/node /opt/api-backend/dist/main.js'.");
  }

  if (restart !== 'always') {
    execValid = false;
    execErrors.push("Restart doit valoir 'always'.");
  }

  if (workingDir !== '/opt/api-backend') {
    execValid = false;
    execErrors.push("WorkingDirectory doit pointer vers '/opt/api-backend'.");
  }

  if (envFile !== '/opt/api-backend/.env') {
    execValid = false;
    execErrors.push("EnvironmentFile doit charger '/opt/api-backend/.env'.");
  }

  if (execValid) {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Section [Service] : Exécution non-root (appuser), chemins absolus, WorkingDirectory, Restart=always et EnvironmentFile validés.";
  } else {
    checks[1].message = execErrors.join(' ');
  }

  // 3. Contrôle du durcissement et [Install] (hardening_and_install_valid)
  let hardValid = true;
  const hardErrors = [];

  const noNewPriv = sections.service.get('NoNewPrivileges');
  const protectSys = sections.service.get('ProtectSystem');
  const privateTmp = sections.service.get('PrivateTmp');
  const wantedBy = sections.install.get('WantedBy');

  if (noNewPriv !== 'true' && noNewPriv !== 'yes') {
    hardValid = false;
    hardErrors.push("Directive de sécurité 'NoNewPrivileges=true' manquante.");
  }

  if (protectSys !== 'full' && protectSys !== 'strict') {
    hardValid = false;
    hardErrors.push("Directive de sécurité 'ProtectSystem=full' manquante.");
  }

  if (privateTmp !== 'true' && privateTmp !== 'yes') {
    hardValid = false;
    hardErrors.push("Directive de sécurité 'PrivateTmp=true' manquante.");
  }

  if (wantedBy !== 'multi-user.target') {
    hardValid = false;
    hardErrors.push("Section [Install] : WantedBy doit cibler 'multi-user.target'.");
  }

  if (hardValid) {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Durcissement systemd (NoNewPrivileges, ProtectSystem, PrivateTmp) et WantedBy=multi-user.target validés.';
  } else {
    checks[2].message = hardErrors.join(' ');
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
  const verdict = validateSystemdUnit(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
