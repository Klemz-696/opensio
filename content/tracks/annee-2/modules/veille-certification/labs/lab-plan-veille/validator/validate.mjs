#!/usr/bin/env node

/**
 * Validateur du lab "Élaboration d'un Plan de Veille Technologique et Synthèse d'Actualité IT"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePlanVeille(workDir = '/work') {
  const planPath = join(workDir, 'veille-plan.yml');
  const synthesePath = join(workDir, 'veille-synthese.md');

  const checks = [
    { id: 'veille_plan_structure_and_theme', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'veille_sources_diversity_and_quality', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'veille_synthese_structure_and_metadata', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'veille_synthese_impact_and_recommendations', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(planPath) || !existsSync(synthesePath)) {
    checks[0].message = 'Fichiers veille-plan.yml ou veille-synthese.md introuvables dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const planContent = readFileSync(planPath, 'utf-8');
  const syntheseContent = readFileSync(synthesePath, 'utf-8');

  // 1. Structure du plan de veille et thématique (veille_plan_structure_and_theme)
  const hasTheme = /theme:\s*['"][^'"]{5,}['"]/i.test(planContent);
  const hasFrequency = /frequency:\s*['"][^'"]+['"]/i.test(planContent);
  const hasTools = /tools:\s*\n(\s*-\s*[^\n]+\n?)+/i.test(planContent);

  if (!hasTheme) {
    checks[0].message = "Une thématique de veille ciblée ('theme') doit être déclarée dans veille-plan.yml.";
  } else if (!hasFrequency) {
    checks[0].message = "Une fréquence de veille régulière ('frequency') doit être spécifiée.";
  } else if (!hasTools) {
    checks[0].message = "La liste des outils d'agrégation et de prise de notes ('tools') doit être définie.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure du plan de veille (thématique, fréquence, outils) validée.';
  }

  // 2. Diversité et qualité des sources (veille_sources_diversity_and_quality)
  const sourceMatches = planContent.match(/-\s*name:\s*['"][^'"]+['"]/gi);
  const hasAtLeast4Sources = sourceMatches && sourceMatches.length >= 4;
  const urlMatches = planContent.match(/url:\s*['"]?https:\/\/[^\s'"]+['"]?/gi);
  const hasValidUrls = urlMatches && urlMatches.length >= 4;

  const typeMatches = planContent.match(/type:\s*['"][^'"]+['"]/gi) || [];
  const uniqueTypes = new Set(typeMatches.map((t) => t.toLowerCase()));

  if (!hasAtLeast4Sources) {
    checks[1].message = "Le plan doit déclarer au moins 4 sources de veille sous 'sources:'.";
  } else if (!hasValidUrls) {
    checks[1].message = "Chaque source doit comporter une URL sécurisée valide (https://...).";
  } else if (uniqueTypes.size < 2) {
    checks[1].message = "Les sources doivent être diversifiées (au moins 2 types distincts : institutionnel, éditeur, communauté, etc.).";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = `Sélection de ${sourceMatches.length} sources diversifiées avec URLs sécurisées validée.`;
  }

  // 3. Structure de la synthèse et métadonnées (veille_synthese_structure_and_metadata)
  const hasTitle = /^#\s+Synthèse/im.test(syntheseContent);
  const hasMetadataSection = /##\s*1\.\s*Métadonnées/i.test(syntheseContent);
  const hasDate = /Date/i.test(syntheseContent) && /\d{4}-\d{2}-\d{2}/.test(syntheseContent);
  const hasSourceMeta = /Source/i.test(syntheseContent);

  if (!hasTitle) {
    checks[2].message = "Le document doit débuter par un titre '# Synthèse de Veille Technologique : ...'.";
  } else if (!hasMetadataSection || !hasDate || !hasSourceMeta) {
    checks[2].message = "La section '## 1. Métadonnées' doit être complétée avec la Date et la Source officielle.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Titre de synthèse et métadonnées de publication validés.';
  }

  // 4. Analyse d'impact et préconisations (veille_synthese_impact_and_recommendations)
  const hasResume = /##\s*2\.\s*Résumé/i.test(syntheseContent);
  const hasImpact = /##\s*3\.\s*Analyse d'Impact/i.test(syntheseContent);
  const hasPreconisations = /##\s*4\.\s*Préconisations/i.test(syntheseContent);

  // Vérifier qu'il n'y a pas que des commentaires HTML placeholder
  const cleanContent = syntheseContent.replace(/<!--[\s\S]*?-->/g, '');
  const hasSubstantialText = cleanContent.length > 300;

  if (!hasResume || !hasImpact || !hasPreconisations) {
    checks[3].message = "Les sections 'Résumé Technique', 'Analyse d'Impact' et 'Préconisations Opérationnelles' sont requises.";
  } else if (!hasSubstantialText) {
    checks[3].message = "La fiche de synthèse doit être rédigée avec une analyse substantielle (au-delà des modèles d'exemples).";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = "Analyse d'impact sur le Système d'Information et préconisations opérationnelles validées.";
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
  const verdict = validatePlanVeille(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
