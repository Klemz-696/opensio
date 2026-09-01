#!/usr/bin/env node

/**
 * Validateur du lab "Centralisation et Analyse des Journaux avec Promtail, Loki et LogQL"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateLokiConfig(workDir = '/work') {
  const promtailPath = join(workDir, 'promtail-config.yml');
  const queriesPath = join(workDir, 'queries.logql');

  const checks = [
    { id: 'promtail_server_and_client_config', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'promtail_scrape_and_pipeline', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'logql_filter_query', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'logql_metric_query', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(promtailPath) || !existsSync(queriesPath)) {
    checks[0].message = 'Fichiers promtail-config.yml ou queries.logql introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const promtailContent = readFileSync(promtailPath, 'utf-8');
  const queriesContent = readFileSync(queriesPath, 'utf-8');

  // 1. Configuration serveur et client Promtail (promtail_server_and_client_config)
  const hasServerPort = /http_listen_port:\s*\d+/i.test(promtailContent);
  const hasPositions = /positions:\s*\n[\s\S]*?filename:\s*[^\n]+/i.test(promtailContent);
  const hasClientUrl = /clients:\s*\n[\s\S]*?url:\s*https?:\/\/[^\/:]+(:\d+)?\/loki\/api\/v1\/push/i.test(promtailContent);

  if (!hasServerPort) {
    checks[0].message = "La directive 'http_listen_port' est requise dans la section server de promtail-config.yml.";
  } else if (!hasPositions) {
    checks[0].message = "La directive 'filename' est requise dans la section positions pour conserver l'état de lecture.";
  } else if (!hasClientUrl) {
    checks[0].message = "L'URL client doit pointer vers l'endpoint d'ingestion de Loki (ex: http://loki:3100/loki/api/v1/push).";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Configuration serveur, positions et client Loki validées.';
  }

  // 2. Scrape configs et pipeline_stages JSON (promtail_scrape_and_pipeline)
  const hasNginxScrape = /scrape_configs:\s*\n[\s\S]*?job:\s*nginx/i.test(promtailContent);
  const hasPathPattern = /__path__:\s*\/var\/log\/nginx\/[^\n]+/i.test(promtailContent);
  const hasPipelineStages = /pipeline_stages:\s*\n[\s\S]*?(json|regex):[\s\S]*?labels:\s*\n[\s\S]*?status:/i.test(promtailContent);

  if (!hasNginxScrape || !hasPathPattern) {
    checks[1].message = "Le job de scraping Nginx doit cibler '/var/log/nginx/*.log' avec le label 'job: nginx'.";
  } else if (!hasPipelineStages) {
    checks[1].message = "La section 'pipeline_stages' doit comporter un parser (json ou regex) et mapper 'status' dans les labels.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Scraping des journaux Nginx et pipeline_stages de parsing JSON/labels validés.';
  }

  // 3. Requête de filtrage LogQL (logql_filter_query)
  const hasStreamSelector = /\{[^}]*job\s*=\s*['"]?nginx['"]?[^}]*\}/i.test(queriesContent);
  const hasErrorFilter = /(\|=\s*['"]?status=|\/~?\s*['"]?50[0-9]|status\s*>=\s*500|\|=\s*['"]?500['"]?)/i.test(queriesContent);

  if (!hasStreamSelector) {
    checks[2].message = "La requête LogQL doit utiliser un sélecteur de flux ciblant les logs Nginx (ex: {job=\"nginx\"}).";
  } else if (!hasErrorFilter) {
    checks[2].message = "La requête LogQL de filtrage doit cibler les erreurs HTTP 5xx (ex: |= \"500\" ou |~ \"50[0-9]\").";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Requête LogQL de sélection et de filtrage des erreurs 5xx validée.';
  }

  // 4. Requête métrique LogQL (logql_metric_query)
  const hasMetricQuery = /(sum|avg|count)?\s*\(?\s*(rate|count_over_time)\s*\(\s*\{[^}]*job\s*=\s*['"]?nginx['"]?[^}]*\}[\s\S]*?\[\d+[smhd]\]\s*\)\s*\)?/i.test(queriesContent);

  if (!hasMetricQuery) {
    checks[3].message = "La requête LogQL métrique doit dériver une série temporelle via rate() ou count_over_time() sur une fenêtre glissante (ex: [5m]).";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Requête LogQL métrique (taux d’erreurs avec rate()) validée.';
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
  const verdict = validateLokiConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
