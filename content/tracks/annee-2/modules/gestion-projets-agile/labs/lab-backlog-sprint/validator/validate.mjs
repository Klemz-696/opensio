#!/usr/bin/env node

/**
 * Validateur du lab "Structuration d'un Product Backlog et Planification de Sprint Agile"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateBacklogSprint(workDir = '/work') {
  const backlogPath = join(workDir, 'product-backlog.yml');
  const sprintPath = join(workDir, 'sprint-planning.yml');

  const checks = [
    { id: 'product_backlog_structure_and_stories', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'acceptance_criteria_and_story_points', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sprint_goal_and_capacity_definition', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'sprint_backlog_selection_and_velocity_fit', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(backlogPath) || !existsSync(sprintPath)) {
    checks[0].message = 'Fichiers product-backlog.yml ou sprint-planning.yml introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const backlogContent = readFileSync(backlogPath, 'utf-8');
  const sprintContent = readFileSync(sprintPath, 'utf-8');

  // 1. Structure du Backlog et User Stories (product_backlog_structure_and_stories)
  const usMatches = backlogContent.match(/-\s*id:\s*['"]?(US-\d+)['"]?/gi);
  const hasAtLeast4Stories = usMatches && usMatches.length >= 4;
  const asAMatches = backlogContent.match(/as_a:\s*['"][^'"]+['"]/gi);
  const iWantMatches = backlogContent.match(/i_want:\s*['"][^'"]+['"]/gi);
  const soThatMatches = backlogContent.match(/so_that:\s*['"][^'"]+['"]/gi);

  const hasFormulation = asAMatches && iWantMatches && soThatMatches &&
    asAMatches.length >= 4 && iWantMatches.length >= 4 && soThatMatches.length >= 4;

  if (!hasAtLeast4Stories) {
    checks[0].message = "Le Product Backlog doit contenir au moins 4 User Stories (identifiants US-01, US-02...).";
  } else if (!hasFormulation) {
    checks[0].message = "Chaque User Story doit comporter 'as_a', 'i_want' et 'so_that'.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure du Product Backlog et formulation des 4 User Stories validées.';
  }

  // 2. Critères d'acceptation et Story Points (acceptance_criteria_and_story_points)
  const hasCriteria = /acceptance_criteria:\s*\n(\s*-\s*[^\n]+\n?)+/i.test(backlogContent);
  const validFibonacci = /story_points:\s*(1|2|3|5|8|13)\b/i.test(backlogContent);
  const spMatches = backlogContent.match(/story_points:\s*(\d+)/gi);
  const allSpValid = spMatches && spMatches.length >= 4 && spMatches.every((m) => {
    const val = parseInt(m.replace(/\D/g, ''), 10);
    return [1, 2, 3, 5, 8, 13].includes(val);
  });

  if (!hasCriteria) {
    checks[1].message = "Les User Stories doivent comporter des listes de critères d'acceptation (acceptance_criteria).";
  } else if (!allSpValid) {
    checks[1].message = "Toutes les estimations story_points doivent appartenir à la suite de Fibonacci (1, 2, 3, 5, 8, 13).";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = "Critères d'acceptation et estimations Fibonacci des User Stories validés.";
  }

  // 3. Objectif de Sprint et Capacité (sprint_goal_and_capacity_definition)
  const hasSprintNumber = /sprint_number:\s*1\b/i.test(sprintContent);
  const hasSprintGoal = /sprint_goal:\s*['"][^'"]{10,}['"]/i.test(sprintContent);
  const hasCapacity = /team_capacity_sp:\s*20\b/i.test(sprintContent);

  if (!hasSprintNumber) {
    checks[2].message = "La directive 'sprint_number: 1' est requise dans sprint-planning.yml.";
  } else if (!hasSprintGoal) {
    checks[2].message = "Un objectif de Sprint explicite et significatif 'sprint_goal' doit être rédigé.";
  } else if (!hasCapacity) {
    checks[2].message = "La capacité de l'équipe 'team_capacity_sp: 20' doit être définie.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = "Cadrage du Sprint 1 (numéro, objectif métier sprint_goal, capacité 20 SP) validé.";
  }

  // 4. Sélection des stories et respect de la vélocité (sprint_backlog_selection_and_velocity_fit)
  const selectedMatches = sprintContent.match(/-\s*['"]?(US-\d+)['"]?/gi);
  const selectedIds = selectedMatches ? selectedMatches.map((m) => {
    const idMatch = m.match(/US-\d+/i);
    return idMatch ? idMatch[0] : '';
  }).filter(Boolean) : [];

  // Extraire les points de chaque story du backlog
  const storyPointsMap = {};
  const storyBlocks = backlogContent.split(/-\s*id:\s*['"]?/);
  for (const block of storyBlocks) {
    const idMatch = block.match(/^(US-\d+)/);
    const spMatch = block.match(/story_points:\s*(\d+)/);
    if (idMatch && spMatch) {
      storyPointsMap[idMatch[1]] = parseInt(spMatch[1], 10);
    }
  }

  let totalSelectedSp = 0;
  for (const id of selectedIds) {
    if (storyPointsMap[id]) {
      totalSelectedSp += storyPointsMap[id];
    }
  }

  if (selectedIds.length < 2) {
    checks[3].message = "Au moins 2 User Stories doivent être sélectionnées sous 'selected_stories:'.";
  } else if (totalSelectedSp > 20) {
    checks[3].message = `La somme des Story Points (${totalSelectedSp} SP) dépasse la capacité maximale de l'équipe (20 SP).`;
  } else if (totalSelectedSp < 13) {
    checks[3].message = `L'engagement du Sprint (${totalSelectedSp} SP) est insuffisant par rapport à la capacité de 20 SP.`;
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = `Sélection du Sprint Backlog (${totalSelectedSp} SP) parfaitement dimensionnée par rapport à la capacité.`;
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
  const verdict = validateBacklogSprint(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
