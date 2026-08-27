#!/usr/bin/env node

/**
 * Validateur du lab "Déploiement d'une Pile Multi-Services avec Docker Compose"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateDockerCompose(workDir = '/work') {
  let filePath = join(workDir, 'docker-compose.yml');
  if (!existsSync(filePath)) {
    filePath = join(workDir, 'compose.yaml');
  }

  const checks = [
    { id: 'services_definitions_and_images', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'networks_isolation_and_ports', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'volumes_persistence_and_restart', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'healthchecks_and_depends_on', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier docker-compose.yml (ou compose.yaml) introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(filePath, 'utf-8');

  // Ignorer les lignes de commentaires
  const cleanContent = rawContent
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

  // Extraction des blocs de services
  const hasServicesRoot = /^services:\s*$/m.test(cleanContent) || /^\s*services:\s*$/m.test(cleanContent);
  if (!hasServicesRoot) {
    checks[0].message = "La clé racine 'services:' est requise dans le fichier Compose.";
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  // 1. Définition des 4 services (services_definitions_and_images)
  const hasProxyService = /^\s*(proxy|nginx|web):\s*$/m.test(cleanContent);
  const hasBackendService = /^\s*(backend|api|app):\s*$/m.test(cleanContent);
  const hasDbService = /^\s*(database|db|postgres):\s*$/m.test(cleanContent);
  const hasCacheService = /^\s*(cache|redis):\s*$/m.test(cleanContent);

  const hasNginxImage = /image:\s*nginx/i.test(cleanContent);
  const hasPostgresImage = /image:\s*postgres/i.test(cleanContent);
  const hasRedisImage = /image:\s*redis/i.test(cleanContent);
  const hasBackendBuild = /build:\s*(\.|context)/i.test(cleanContent) || /image:\s*app/i.test(cleanContent);

  if (!hasProxyService || !hasBackendService || !hasDbService || !hasCacheService) {
    checks[0].message = 'Les 4 services (proxy Nginx, backend Node, database PostgreSQL, cache Redis) doivent être déclarés.';
  } else if (!hasNginxImage || !hasPostgresImage || !hasRedisImage || !hasBackendBuild) {
    checks[0].message = 'Les images officielles (nginx, postgres, redis) et la directive build du backend doivent être spécifiées.';
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Définition des 4 services (proxy, backend, database, cache) et images associées validée.';
  }

  // 2. Isolation réseau et publication de ports (networks_isolation_and_ports)
  // Découpage par service basé sur l'indentation standard (2 espaces pour le service, 4 espaces pour ses propriétés)
  const extractServiceBlock = (serviceName) => {
    const lines = cleanContent.split('\n');
    let inside = false;
    const blockLines = [];

    for (const line of lines) {
      const isServiceStart = new RegExp(`^[ \\t]{2}${serviceName}:[ \\t]*$`).test(line);
      const isOtherTopLevelOrService = /^[ \t]{0,2}[a-zA-Z0-9_-]+:[ \t]*$/.test(line);

      if (isServiceStart) {
        inside = true;
        continue;
      }

      if (inside) {
        if (isOtherTopLevelOrService) {
          break;
        }
        blockLines.push(line);
      }
    }

    return blockLines.join('\n');
  };

  const proxyBlock = extractServiceBlock('proxy') || extractServiceBlock('nginx');
  const backendBlock = extractServiceBlock('backend') || extractServiceBlock('api');
  const dbBlock = extractServiceBlock('database') || extractServiceBlock('db') || extractServiceBlock('postgres');
  const cacheBlock = extractServiceBlock('cache') || extractServiceBlock('redis');

  const proxyHasPort80 = /ports:\s*\n[\s\S]*?(80:80|"80:80"|'80:80'|- 80)/i.test(proxyBlock);
  const dbHasPublicPorts = /ports:\s*\n[\s\S]*?(5432|- \d+)/i.test(dbBlock);

  const proxyInFrontend = /frontend/i.test(proxyBlock);
  const dbInBackend = /backend/i.test(dbBlock);
  const cacheInBackend = /backend/i.test(cacheBlock);
  const backendInBoth = /frontend/i.test(backendBlock) && /backend/i.test(backendBlock);

  if (!proxyHasPort80) {
    checks[1].message = "Le service proxy doit exposer le port 80 vers l'extérieur ('80:80').";
  } else if (dbHasPublicPorts) {
    checks[1].message = 'Sécurité critique : le service database ne doit avoir aucun port exposé vers l’hôte (isolation réseau interne).';
  } else if (!proxyInFrontend || !dbInBackend || !cacheInBackend || !backendInBoth) {
    checks[1].message = 'Segmentation réseau invalide : proxy sur frontend-net, database/cache sur backend-net et backend connecté aux deux réseaux.';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Segmentation réseau étanche (frontend/backend) et publication sécurisée des ports validées.';
  }

  // 3. Persistance des volumes et Restart (volumes_persistence_and_restart)
  const hasTopVolumes = /^volumes:\s*$/m.test(cleanContent) && /(db_data|postgres_data|db-data)/i.test(cleanContent);
  const dbHasVolumeMount = /volumes:\s*\n[\s\S]*?\/var\/lib\/postgresql\/data/i.test(dbBlock);
  const hasRestartPolicy = /restart:\s*(unless-stopped|always)/i.test(cleanContent);

  if (!hasTopVolumes) {
    checks[2].message = "La section racine 'volumes:' doit déclarer un volume nommé persistant (ex: db_data).";
  } else if (!dbHasVolumeMount) {
    checks[2].message = 'Le service database doit monter le volume nommé persistant sur /var/lib/postgresql/data.';
  } else if (!hasRestartPolicy) {
    checks[2].message = "La directive 'restart: unless-stopped' est requise sur l'ensemble des services en production.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Persistance des données PostgreSQL par volume nommé et politique de redémarrage automatique validées.';
  }

  // 4. Sondes de santé et depends_on (healthchecks_and_depends_on)
  const dbHasHealthcheck = /healthcheck:[\s\S]*?pg_isready/i.test(dbBlock);
  const backendHasHealthcheck = /healthcheck:/i.test(backendBlock);
  const hasConditionHealthy = /condition:\s*service_healthy/i.test(cleanContent);

  if (!dbHasHealthcheck) {
    checks[3].message = "Le service database doit comporter un healthcheck basé sur 'pg_isready'.";
  } else if (!backendHasHealthcheck) {
    checks[3].message = 'Le service backend doit comporter une sonde de santé healthcheck.';
  } else if (!hasConditionHealthy) {
    checks[3].message = "La directive 'depends_on' doit utiliser 'condition: service_healthy' pour garantir un démarrage ordonné et synchrone.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Sondes de santé (pg_isready, health) et dépendances ordonnées condition: service_healthy validées.';
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
  const verdict = validateDockerCompose(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
