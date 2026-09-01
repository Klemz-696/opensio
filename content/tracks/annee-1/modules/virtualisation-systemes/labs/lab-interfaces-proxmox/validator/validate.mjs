#!/usr/bin/env node

/**
 * Validateur du lab "Configuration des Interfaces Réseau Proxmox (Bridges & VLANs)"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateInterfaces(workDir = '/work') {
  const filePath = join(workDir, 'interfaces');

  const checks = [
    { id: 'loopback_and_physical', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'public_bridge_vmbr0', passed: false, points: 0, maxPoints: 35, message: '' },
    { id: 'vlan_awareness', passed: false, points: 0, maxPoints: 20, message: '' },
    { id: 'isolated_bridge_vmbr1', passed: false, points: 0, maxPoints: 20, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = "Fichier interfaces introuvable dans le répertoire de travail.";
    checks[1].message = "Validation impossible : fichier absent.";
    checks[2].message = "Validation impossible : fichier absent.";
    checks[3].message = "Validation impossible : fichier absent.";
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(filePath, 'utf-8');
  const lines = rawContent.split(/\r?\n/).map((l) => l.trim());

  // Découpage par strophes d'interfaces
  const sections = new Map();
  let currentIface = null;
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.length === 0) continue;

    if (line.startsWith('iface ') || line.startsWith('auto ')) {
      const parts = line.split(/\s+/);
      const ifaceName = parts[1];

      if (line.startsWith('iface ')) {
        if (currentIface) {
          sections.set(currentIface, currentLines);
        }
        currentIface = ifaceName;
        currentLines = [line];
      } else if (line.startsWith('auto ') && currentIface === ifaceName) {
        currentLines.push(line);
      }
    } else if (currentIface) {
      currentLines.push(line);
    }
  }
  if (currentIface) {
    sections.set(currentIface, currentLines);
  }

  // 1. Contrôle loopback et carte physique eno1 (loopback_and_physical)
  const loSection = sections.get('lo') || [];
  const eno1Section = sections.get('eno1') || [];

  const hasLo = loSection.some((l) => l.includes('loopback'));
  const hasEno1Manual = eno1Section.some((l) => l.includes('manual') || (l.includes('iface eno1') && l.includes('manual')));

  if (!hasLo) {
    checks[0].message = "L'interface de boucle locale 'iface lo inet loopback' est absente ou mal déclarée.";
  } else if (!hasEno1Manual) {
    checks[0].message = "L'interface physique 'eno1' doit être déclarée en mode manuel ('iface eno1 inet manual').";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = "Interface de boucle locale et carte physique Gigabit configurées.";
  }

  // 2. Contrôle du pont public vmbr0 (public_bridge_vmbr0)
  const vmbr0Section = sections.get('vmbr0') || [];
  const vmbr0Text = vmbr0Section.join('\n');

  const hasVmbr0Ip = vmbr0Section.some((l) => l.includes('192.168.10.250'));
  const hasVmbr0Gw = vmbr0Section.some((l) => l.includes('gateway') && l.includes('192.168.10.254'));
  const hasVmbr0Ports = vmbr0Section.some((l) => l.includes('bridge-ports') && l.includes('eno1'));

  if (!hasVmbr0Ip) {
    checks[1].message = "Adresse IP attendue sur vmbr0 : '192.168.10.250/24' (ou netmask 255.255.255.0).";
  } else if (!hasVmbr0Gw) {
    checks[1].message = "Passerelle par défaut attendue sur vmbr0 : 'gateway 192.168.10.254'.";
  } else if (!hasVmbr0Ports) {
    checks[1].message = "Le pont vmbr0 doit être relié à la carte physique via 'bridge-ports eno1'.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Pont public vmbr0, adresse IP et passerelle par défaut configurés avec succès.";
  }

  // 3. Contrôle de la prise en charge des VLANs sur vmbr0 (vlan_awareness)
  const hasVlanAware = vmbr0Section.some((l) => l.includes('bridge-vlan-aware') && (l.includes('yes') || l.includes('1')));

  if (!hasVlanAware) {
    checks[2].message = "Le pont vmbr0 doit activer le support 802.1Q avec 'bridge-vlan-aware yes'.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = "Pont vmbr0 configuré en mode VLAN-aware 802.1Q.";
  }

  // 4. Contrôle du pont privé isolé vmbr1 (isolated_bridge_vmbr1)
  const vmbr1Section = sections.get('vmbr1') || [];
  const hasVmbr1Ip = vmbr1Section.some((l) => l.includes('10.0.0.254'));
  const hasVmbr1PortsNone = vmbr1Section.some((l) => l.includes('bridge-ports') && l.includes('none'));

  if (!hasVmbr1Ip) {
    checks[3].message = "Adresse IP attendue sur vmbr1 (DMZ privée) : '10.0.0.254/24'.";
  } else if (!hasVmbr1PortsNone) {
    checks[3].message = "Le pont isolé vmbr1 doit déclarer 'bridge-ports none' pour empêcher toute fuite physique.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Pont privé isolé vmbr1 (10.0.0.254/24) configuré pour la DMZ interne.";
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
  const verdict = validateInterfaces(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
