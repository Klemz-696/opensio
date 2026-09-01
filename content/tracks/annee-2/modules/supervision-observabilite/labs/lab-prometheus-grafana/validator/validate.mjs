#!/usr/bin/env node

/**
 * Validateur du lab "Configuration de la Collecte Prometheus, des Règles d'Alerte et d'un Dashboard Grafana"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePrometheusConfig(workDir = '/work') {
  const promPath = join(workDir, 'prometheus.yml');
  const alertsPath = join(workDir, 'alerts.yml');

  const checks = [
    { id: 'prometheus_scrape_configs', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'alerting_rules_structure', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'promql_expressions_validity', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'annotations_and_runbook', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(promPath) || !existsSync(alertsPath)) {
    checks[0].message = 'Fichiers prometheus.yml ou alerts.yml introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const promContent = readFileSync(promPath, 'utf-8');
  const alertsContent = readFileSync(alertsPath, 'utf-8');

  // 1. Configuration Prometheus et scrape configs (prometheus_scrape_configs)
  const hasScrapeInterval = /scrape_interval:\s*\d+[smhd]/i.test(promContent);
  const hasRuleFiles = /rule_files:\s*\n[\s\S]*?alerts\.yml/i.test(promContent);
  const hasNodeJob = /job_name:\s*['"]?(node|node-exporter|linux-nodes)['"]?[\s\S]*?9100/i.test(promContent);
  const hasNginxJob = /job_name:\s*['"]?(nginx|web|nginx-exporter)['"]?[\s\S]*?(9113|8080|80)/i.test(promContent);

  if (!hasScrapeInterval) {
    checks[0].message = "La directive 'scrape_interval' est requise dans la section 'global' de prometheus.yml.";
  } else if (!hasRuleFiles) {
    checks[0].message = "Le fichier de règles 'alerts.yml' doit être inclus sous 'rule_files' dans prometheus.yml.";
  } else if (!hasNodeJob || !hasNginxJob) {
    checks[0].message = "Les jobs de scraping pour node-exporter (port 9100) et nginx (port 9113/8080) doivent être configurés dans scrape_configs.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Configuration Prometheus globale, inclusion des règles et scrape configs validées.';
  }

  // 2. Structure des alertes (alerting_rules_structure)
  const hasGroups = /groups:\s*\n[\s\S]*?rules:\s*\n/i.test(alertsContent);
  const hasInstanceDown = /alert:\s*['"]?InstanceDown['"]?/i.test(alertsContent);
  const hasHighCpu = /alert:\s*['"]?(HighCpuUsage|HighCpu)['"]?/i.test(alertsContent);
  const hasFor = /for:\s*\d+[smhd]/i.test(alertsContent);
  const hasSeverity = /severity:\s*['"]?(critical|warning|page)['"]?/i.test(alertsContent);

  if (!hasGroups) {
    checks[1].message = "Le fichier alerts.yml doit définir au moins un groupe sous la clé 'groups:'.";
  } else if (!hasInstanceDown || !hasHighCpu) {
    checks[1].message = "Les deux alertes 'InstanceDown' et 'HighCpuUsage' doivent être déclarées.";
  } else if (!hasFor || !hasSeverity) {
    checks[1].message = "Chaque alerte doit comporter un délai de persistance 'for:' et un label 'severity:'.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Structure des alertes (InstanceDown, HighCpuUsage, for, severity) validée.';
  }

  // 3. Validité des expressions PromQL (promql_expressions_validity)
  const hasExprDown = /expr:\s*up\s*==\s*0/i.test(alertsContent);
  const hasExprCpu = /expr:[\s\S]*?(node_cpu_seconds_total|rate|avg)[\s\S]*?(85|0\.85|>)/i.test(alertsContent);

  if (!hasExprDown) {
    checks[2].message = "L'expression PromQL pour InstanceDown doit vérifier 'up == 0'.";
  } else if (!hasExprCpu) {
    checks[2].message = "L'expression PromQL pour HighCpuUsage doit calculer l'utilisation CPU à partir de node_cpu_seconds_total.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Expressions PromQL d’alerte (détection de panne et seuil CPU) validées.';
  }

  // 4. Annotations et messages (annotations_and_runbook)
  const hasSummary = /summary:\s*[^\n]+/i.test(alertsContent);
  const hasDescription = /description:\s*[^\n]+/i.test(alertsContent);

  if (!hasSummary || !hasDescription) {
    checks[3].message = "Chaque alerte doit inclure les annotations 'summary' et 'description' pour guider l'exploitant.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Annotations opérationnelles (summary et description explicites) validées.';
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
  const verdict = validatePrometheusConfig(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
