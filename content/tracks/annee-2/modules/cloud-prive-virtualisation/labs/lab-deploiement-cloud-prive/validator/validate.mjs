#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement et Configuration d'un Cluster Cloud Privé avec SDN et Quotas"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateClusterConfig(workDir = '/work') {
  const clusterPath = join(workDir, 'cluster-config.yml');
  const sdnPath = join(workDir, 'sdn-zones.cfg');

  const checks = [
    { id: 'cluster_nodes_and_ha_config', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'resource_pools_and_quotas', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sdn_zone_definition', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sdn_vnets_and_subnets', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(clusterPath) || !existsSync(sdnPath)) {
    checks[0].message = 'Fichiers cluster-config.yml ou sdn-zones.cfg introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const clusterContent = readFileSync(clusterPath, 'utf-8');
  const sdnContent = readFileSync(sdnPath, 'utf-8');

  // 1. Configuration du Cluster et HA (cluster_nodes_and_ha_config)
  const hasClusterName = /cluster_name:\s*['"]?[a-zA-Z0-9_-]+['"]?/i.test(clusterContent);
  const nodeMatches = clusterContent.match(/-\s*name:\s*['"]?[a-zA-Z0-9_-]+['"]?/gi);
  const hasThreeNodes = nodeMatches && nodeMatches.length >= 3;
  const hasNodeIps = /ip:\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(clusterContent);
  const hasHa = /ha_enabled:\s*(true|yes)/i.test(clusterContent);

  if (!hasClusterName) {
    checks[0].message = "La directive 'cluster_name' est requise dans cluster-config.yml.";
  } else if (!hasThreeNodes || !hasNodeIps) {
    checks[0].message = "Au moins 3 nœuds d'hyperviseurs avec leurs adresses IP de cluster doivent être déclarés.";
  } else if (!hasHa) {
    checks[0].message = "La haute disponibilité 'ha_enabled: true' doit être activée pour le cluster.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Topologie du cluster (nom, 3 nœuds avec IP dédiées) et HA validées.';
  }

  // 2. Pools de ressources et Quotas (resource_pools_and_quotas)
  const hasResourcePool = /resource_pools:\s*\n[\s\S]*?name:\s*['"]?project-data['"]?/i.test(clusterContent);
  const hasVcpuQuota = /max_vcpus:\s*\d+/i.test(clusterContent);
  const hasMemoryQuota = /max_memory_mb:\s*\d+/i.test(clusterContent);
  const hasStorageQuota = /max_storage_gb:\s*\d+/i.test(clusterContent);

  if (!hasResourcePool) {
    checks[1].message = "Le pool de ressources multi-tenant 'project-data' doit être défini sous 'resource_pools:'.";
  } else if (!hasVcpuQuota || !hasMemoryQuota || !hasStorageQuota) {
    checks[1].message = "Les quotas 'max_vcpus', 'max_memory_mb' et 'max_storage_gb' doivent être spécifiés.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Pool de ressources multi-tenant et plafonds de quotas validés.';
  }

  // 3. Définition de la Zone SDN (sdn_zone_definition)
  const hasVxlanZone = /(vxlan:\s*zone-prod|zone:\s*vxlan|type:\s*vxlan[\s\S]*?zone-prod)/i.test(sdnContent);
  const hasMtu = /mtu:\s*1450/i.test(sdnContent);
  const hasPeers = /peers:\s*[^\n]+/i.test(sdnContent);

  if (!hasVxlanZone) {
    checks[2].message = "Une zone SDN de type VXLAN nommée 'zone-prod' doit être configurée dans sdn-zones.cfg.";
  } else if (!hasMtu || !hasPeers) {
    checks[2].message = "La zone VXLAN doit comporter un MTU adapté (1450) et la liste des pairs (peers).";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Configuration de la zone SDN VXLAN (nom, MTU 1450, pairs) validée.';
  }

  // 4. Définition des VNets et sous-réseaux (sdn_vnets_and_subnets)
  const hasVnetFrontend = /vnet:\s*vnet-frontend[\s\S]*?tag:\s*10000/i.test(sdnContent);
  const hasVnetBackend = /vnet:\s*vnet-backend[\s\S]*?tag:\s*10001/i.test(sdnContent);
  const hasSubnet = /subnet:\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}/i.test(sdnContent);
  const hasGateway = /gateway:\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(sdnContent);

  if (!hasVnetFrontend || !hasVnetBackend) {
    checks[3].message = "Les deux VNets 'vnet-frontend' (tag 10000) et 'vnet-backend' (tag 10001) doivent être déclarés.";
  } else if (!hasSubnet || !hasGateway) {
    checks[3].message = "Chaque VNet doit être associé à une définition de sous-réseau (subnet) et de passerelle (gateway).";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Déclaration des VNets (frontend/backend) avec tags, sous-réseaux et passerelles validée.';
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
  const verdict = validateClusterConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
