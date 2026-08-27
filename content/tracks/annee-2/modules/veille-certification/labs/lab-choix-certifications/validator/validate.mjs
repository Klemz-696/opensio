#!/usr/bin/env node

/**
 * Validateur du lab "Construction d'un Parcours de Certifications IT et Plan d'Étude"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateCertificationsPlan(workDir = '/work') {
  const roadmapPath = join(workDir, 'certification-roadmap.yml');
  const studyPath = join(workDir, 'study-plan.yml');

  const checks = [
    { id: 'career_target_and_certifications_list', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'budget_and_timeline_coherence', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'study_plan_schedule_and_intensity', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'learning_resources_and_lab_environment', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(roadmapPath) || !existsSync(studyPath)) {
    checks[0].message = 'Fichiers certification-roadmap.yml ou study-plan.yml introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const roadmapContent = readFileSync(roadmapPath, 'utf-8');
  const studyContent = readFileSync(studyPath, 'utf-8');

  // 1. Profil cible et liste des certifications (career_target_and_certifications_list)
  const hasTargetRole = /target_role:\s*['"][^'"]{5,}['"]/i.test(roadmapContent);
  const certMatches = roadmapContent.match(/-\s*code:\s*['"][^'"]+['"]/gi);
  const hasAtLeast2Certs = certMatches && certMatches.length >= 2;
  const hasVendors = (roadmapContent.match(/vendor:\s*['"][^'"]+['"]/gi) || []).length >= 2;
  const hasLevels = (roadmapContent.match(/level:\s*['"][^'"]+['"]/gi) || []).length >= 2;

  if (!hasTargetRole) {
    checks[0].message = "Le profil métier cible ('target_role') doit être explicité dans certification-roadmap.yml.";
  } else if (!hasAtLeast2Certs) {
    checks[0].message = "Au moins 2 certifications officielles doivent être planifiées sous 'certifications:'.";
  } else if (!hasVendors || !hasLevels) {
    checks[0].message = "Chaque certification doit comporter son éditeur ('vendor') et son niveau ('level').";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = `Sélection de ${certMatches.length} certifications alignées avec le profil cible validée.`;
  }

  // 2. Cohérence du budget et échéancier (budget_and_timeline_coherence)
  const costMatches = roadmapContent.match(/estimated_cost_eur:\s*(\d+)/gi);
  const totalBudgetMatch = roadmapContent.match(/total_budget_eur:\s*(\d+)/i);
  const quarters = roadmapContent.match(/target_quarter:\s*['"]\d{4}-Q[1-4]['"]/gi);

  let calculatedSum = 0;
  if (costMatches) {
    for (const m of costMatches) {
      calculatedSum += parseInt(m.replace(/\D/g, ''), 10);
    }
  }

  const declaredBudget = totalBudgetMatch ? parseInt(totalBudgetMatch[1], 10) : -1;
  const hasQuarters = quarters && quarters.length >= (certMatches ? certMatches.length : 2);

  if (!hasQuarters) {
    checks[1].message = "Chaque certification doit avoir un trimestre cible d'échéance ('target_quarter', ex: 2026-Q4).";
  } else if (!totalBudgetMatch || declaredBudget !== calculatedSum || calculatedSum <= 0) {
    checks[1].message = `Le budget total déclaré (${declaredBudget} €) ne correspond pas à la somme des coûts (${calculatedSum} €).`;
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = `Budget total (${calculatedSum} €) et échéancier trimestriel validés.`;
  }

  // 3. Rythme et durée de révision (study_plan_schedule_and_intensity)
  const weeklyHoursMatch = studyContent.match(/weekly_study_hours:\s*(\d+)/i);
  const prepWeeksMatch = studyContent.match(/prep_weeks_per_cert:\s*(\d+)/i);

  const weeklyHours = weeklyHoursMatch ? parseInt(weeklyHoursMatch[1], 10) : 0;
  const prepWeeks = prepWeeksMatch ? parseInt(prepWeeksMatch[1], 10) : 0;

  const validHours = weeklyHours >= 5 && weeklyHours <= 15;
  const validWeeks = prepWeeks >= 8 && prepWeeks <= 16;

  if (!validHours) {
    checks[2].message = "Le volume d'étude hebdomadaire ('weekly_study_hours') doit être réaliste (entre 5 et 15 h).";
  } else if (!validWeeks) {
    checks[2].message = "La durée de préparation par certification ('prep_weeks_per_cert') doit être comprise entre 8 et 16 semaines.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = `Rythme d'étude (${weeklyHours} h/semaine sur ${prepWeeks} semaines/cert) validé.`;
  }

  // 4. Ressources et environnement de laboratoire (learning_resources_and_lab_environment)
  const resourceMatches = studyContent.match(/-\s*['"][^'"]+['"]/gi);
  const hasAtLeast3Resources = resourceMatches && resourceMatches.length >= 3;
  const hasLabEnv = /lab_environment:\s*['"][^'"]{10,}['"]/i.test(studyContent);

  if (!hasAtLeast3Resources) {
    checks[3].message = "Au moins 3 ressources d'étude variées (cours, labs, examens blancs) doivent être listées sous 'resources:'.";
  } else if (!hasLabEnv) {
    checks[3].message = "L'environnement de pratique ('lab_environment', ex: Home Lab Proxmox, Packet Tracer) doit être décrit.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Diversité des ressources d'étude et environnement de laboratoire validés.";
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
  const verdict = validateCertificationsPlan(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
