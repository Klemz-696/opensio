#!/usr/bin/env node

/**
 * Validateur du lab "Mise en Place d'un Tableau Kanban avec Limites WIP et Simulation de Flux"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateKanbanBoard(workDir = '/work') {
  const boardPath = join(workDir, 'kanban-board.yml');
  const workflowPath = join(workDir, 'workflow-simulation.yml');

  const checks = [
    { id: 'kanban_board_columns_structure', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'wip_limits_and_exit_criteria', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'workflow_tasks_simulation', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'lead_and_cycle_time_metrics_coherence', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(boardPath) || !existsSync(workflowPath)) {
    checks[0].message = 'Fichiers kanban-board.yml ou workflow-simulation.yml introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const boardContent = readFileSync(boardPath, 'utf-8');
  const workflowContent = readFileSync(workflowPath, 'utf-8');

  // 1. Structure des colonnes du tableau (kanban_board_columns_structure)
  const colMatches = boardContent.match(/-\s*id:\s*['"]?[a-zA-Z0-9_-]+['"]?/gi);
  const hasAtLeast5Cols = colMatches && colMatches.length >= 5;
  const hasBacklog = /id:\s*['"]?backlog['"]?/i.test(boardContent);
  const hasInProgress = /id:\s*['"]?in_progress['"]?/i.test(boardContent);
  const hasReview = /id:\s*['"]?(review|review_test|test)['"]?/i.test(boardContent);
  const hasDone = /id:\s*['"]?done['"]?/i.test(boardContent);

  if (!hasAtLeast5Cols || !hasBacklog || !hasInProgress || !hasReview || !hasDone) {
    checks[0].message = "Le tableau Kanban doit comporter au moins 5 colonnes incluant backlog, in_progress, review_test et done.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure et enchaînement des colonnes Kanban validés.';
  }

  // 2. Limites WIP et critères de sortie (wip_limits_and_exit_criteria)
  const wipMatches = boardContent.match(/wip_limit:\s*\d+/gi);
  const hasMultipleWipLimits = wipMatches && wipMatches.length >= 2;
  const hasExitCriteria = /exit_criteria:\s*['"][^'"]+['"]/i.test(boardContent);

  if (!hasMultipleWipLimits) {
    checks[1].message = "Des limites WIP numériques explicites ('wip_limit') doivent être définies sur les colonnes actives.";
  } else if (!hasExitCriteria) {
    checks[1].message = "Des critères de sortie ('exit_criteria') doivent être spécifiés pour encadrer les transitions de colonnes.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Limites WIP d’activité et critères de sortie (Definition of Done locale) validés.';
  }

  // 3. Simulation des tâches et dates (workflow_tasks_simulation)
  const taskMatches = workflowContent.match(/-\s*id:\s*['"]?(TASK-\d+)['"]?/gi);
  const hasAtLeast4Tasks = taskMatches && taskMatches.length >= 4;
  const createdMatches = workflowContent.match(/created_date:\s*['"]?\d{4}-\d{2}-\d{2}['"]?/gi);
  const inProgressMatches = workflowContent.match(/in_progress_date:\s*['"]?\d{4}-\d{2}-\d{2}['"]?/gi);
  const doneMatches = workflowContent.match(/done_date:\s*['"]?\d{4}-\d{2}-\d{2}['"]?/gi);

  const hasAllDates = createdMatches && inProgressMatches && doneMatches &&
    createdMatches.length >= 4 && inProgressMatches.length >= 4 && doneMatches.length >= 4;

  if (!hasAtLeast4Tasks || !hasAllDates) {
    checks[2].message = "La simulation doit comporter au moins 4 tâches complètes avec created_date, in_progress_date et done_date.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Simulation de flux de 4 tâches avec horodatages complets validée.';
  }

  // 4. Cohérence des métriques Lead Time et Cycle Time (lead_and_cycle_time_metrics_coherence)
  const leadMatches = workflowContent.match(/lead_time_days:\s*(\d+)/gi);
  const cycleMatches = workflowContent.match(/cycle_time_days:\s*(\d+)/gi);

  const hasMetrics = leadMatches && cycleMatches && leadMatches.length >= 4 && cycleMatches.length >= 4;
  let metricsCoherent = true;

  if (hasMetrics) {
    for (let i = 0; i < leadMatches.length; i++) {
      const lead = parseInt(leadMatches[i].replace(/\D/g, ''), 10);
      const cycle = parseInt(cycleMatches[i].replace(/\D/g, ''), 10);
      if (lead < cycle) {
        metricsCoherent = false;
        break;
      }
    }
  }

  if (!hasMetrics) {
    checks[3].message = "Les métriques 'lead_time_days' et 'cycle_time_days' doivent être renseignées pour chaque tâche.";
  } else if (!metricsCoherent) {
    checks[3].message = "Incohérence métrologique : le Lead Time ne peut pas être inférieur au Cycle Time.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Calculs métrologiques du Lead Time et Cycle Time cohérents et validés.';
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
  const verdict = validateKanbanBoard(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
