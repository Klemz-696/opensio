#!/usr/bin/env node

/**
 * Validateur du lab "Orchestration et Provisionnement Automatisé de VMs avec Cloud-Init et Snapshots"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateVmOrchestration(workDir = '/work') {
  const userDataPath = join(workDir, 'user-data');
  const vmOrchPath = join(workDir, 'vm-orchestration.yml');

  const checks = [
    { id: 'cloud_init_header_and_users', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'cloud_init_packages_and_runcmd', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'vm_cloning_and_hardware_specs', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'vm_network_and_snapshot_policy', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(userDataPath) || !existsSync(vmOrchPath)) {
    checks[0].message = 'Fichiers user-data ou vm-orchestration.yml introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const userDataContent = readFileSync(userDataPath, 'utf-8');
  const vmOrchContent = readFileSync(vmOrchPath, 'utf-8');

  // 1. Entête Cloud-Init et Utilisateurs (cloud_init_header_and_users)
  const hasCloudConfigHeader = /^#cloud-config/m.test(userDataContent);
  const hasHostname = /hostname:\s*['"]?[a-zA-Z0-9_-]+['"]?/i.test(userDataContent);
  const hasUserDevops = /name:\s*['"]?devops['"]?/i.test(userDataContent);
  const hasSshKeys = /ssh_authorized_keys:\s*\n[\s\S]*?ssh-(rsa|ed25519)/i.test(userDataContent);
  const hasSudo = /sudo:\s*[^\n]+/i.test(userDataContent) || /groups:\s*.*sudo/i.test(userDataContent);

  if (!hasCloudConfigHeader) {
    checks[0].message = "La première ligne du fichier user-data doit contenir '#cloud-config'.";
  } else if (!hasHostname) {
    checks[0].message = "La directive 'hostname' est requise dans la configuration Cloud-Init.";
  } else if (!hasUserDevops || !hasSshKeys || !hasSudo) {
    checks[0].message = "L'utilisateur 'devops' doit être déclaré avec privilèges sudo et une clé publique dans 'ssh_authorized_keys'.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Entête #cloud-config, hostname et utilisateur devops avec clé SSH validés.';
  }

  // 2. Paquets logiciels et runcmd (cloud_init_packages_and_runcmd)
  const hasGuestAgent = /packages:\s*\n[\s\S]*?qemu-guest-agent/i.test(userDataContent);
  const hasNginxPkg = /packages:\s*\n[\s\S]*?nginx/i.test(userDataContent);
  const hasRunCmd = /runcmd:\s*\n[\s\S]*?systemctl/i.test(userDataContent);

  if (!hasGuestAgent || !hasNginxPkg) {
    checks[1].message = "Les paquets 'qemu-guest-agent' et 'nginx' doivent être spécifiés sous 'packages:'.";
  } else if (!hasRunCmd) {
    checks[1].message = "La section 'runcmd' doit contenir les commandes d'activation des services (systemctl).";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Déclaration des paquets (qemu-guest-agent, nginx) et commandes runcmd validées.';
  }

  // 3. Spécifications matérielles et clonage lié (vm_cloning_and_hardware_specs)
  const hasTemplate = /template(_id)?:\s*['"]?[a-zA-Z0-9_-]+['"]?/i.test(vmOrchContent);
  const hasLinkedClone = /(clone_mode:\s*linked|linked_clone:\s*true)/i.test(vmOrchContent);
  const hasCores = /cores:\s*\d+/i.test(vmOrchContent);
  const hasMemory = /memory(_mb)?:\s*\d+/i.test(vmOrchContent);
  const hasDisk = /disk(_size_gb)?:\s*\d+/i.test(vmOrchContent);

  if (!hasTemplate || !hasLinkedClone) {
    checks[2].message = "Le template parent et le mode de clonage lié 'clone_mode: linked' doivent être déclarés.";
  } else if (!hasCores || !hasMemory || !hasDisk) {
    checks[2].message = "Le dimensionnement matériel (cores, memory_mb, disk_size_gb) doit être renseigné.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Paramètres de clonage lié (Linked Clone) et dimensionnement matériel validés.';
  }

  // 4. Réseau SDN et politique de snapshot (vm_network_and_snapshot_policy)
  const hasNetworkBridge = /(bridge|vnet):\s*['"]?(vnet-frontend|vnet|vmbr\d+)['"]?/i.test(vmOrchContent);
  const hasSnapshotPolicy = /(snapshot_before_deploy:\s*true|snapshot:\s*[^\n]+)/i.test(vmOrchContent);

  if (!hasNetworkBridge) {
    checks[3].message = "L'interface réseau de la VM doit être rattachée à un pont/VNet SDN (ex: vnet-frontend).";
  } else if (!hasSnapshotPolicy) {
    checks[3].message = "Une politique de snapshot avant mise en production 'snapshot_before_deploy: true' est requise.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Attachement au réseau SDN et politique de snapshot validés.';
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
  const verdict = validateVmOrchestration(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
