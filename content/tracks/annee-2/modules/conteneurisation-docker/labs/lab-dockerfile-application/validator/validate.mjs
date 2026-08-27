#!/usr/bin/env node

/**
 * Validateur du lab "Construction d'une Image Docker Sécurisée et Multi-Stage (Node.js API)"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateDockerfile(workDir = '/work') {
  const filePath = join(workDir, 'Dockerfile');

  const checks = [
    { id: 'multistage_structure_and_base_images', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'builder_dependencies_and_compilation', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'production_stage_copy_and_env', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'security_non_root_and_cmd_exec', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier Dockerfile introuvable dans le répertoire de travail.';
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
  const linesWithoutComments = rawContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !l.startsWith('#'))
    .join('\n');

  // 1. Structure Multi-Stage (multistage_structure_and_base_images)
  const fromMatches = [...linesWithoutComments.matchAll(/FROM\s+([^\s\n]+)(?:\s+AS\s+([^\s\n]+))?/gi)];

  if (fromMatches.length < 2) {
    checks[0].message = 'Le Dockerfile doit comporter au minimum 2 étapes de build (Multi-Stage Build avec FROM ... AS ...).';
  } else {
    const firstStage = fromMatches[0];
    const secondStage = fromMatches[1];
    const hasBuilderAlias = Boolean(firstStage[2] && /^(builder|build)$/i.test(firstStage[2]));
    const hasAlpineOrNode = /node/i.test(firstStage[1]) && /node/i.test(secondStage[1]);

    if (!hasBuilderAlias) {
      checks[0].message = "La première étape doit être nommée avec un alias explicite (ex: 'FROM node:22-alpine AS builder').";
    } else if (!hasAlpineOrNode) {
      checks[0].message = "Les images de base doivent s'appuyer sur l'écosystème Node.js (ex: node:22-alpine).";
    } else {
      checks[0].passed = true;
      checks[0].points = checks[0].maxPoints;
      checks[0].message = 'Structure Multi-Stage Build et images de base Node.js validées.';
    }
  }

  // Découpage en deux blocs d'étapes
  const stages = linesWithoutComments.split(/FROM\s+/i).filter(Boolean);
  const builderStage = stages[0] ? `FROM ${stages[0]}` : '';
  const prodStage = stages[1] ? `FROM ${stages[1]}` : '';

  // 2. Étape Builder (builder_dependencies_and_compilation)
  const builderHasWorkdir = /WORKDIR\s+\/[a-zA-Z0-9_-]+/i.test(builderStage);
  const builderHasPackageCopy = /COPY\s+package(\*|\.json|\s)+/i.test(builderStage);
  const builderHasNpmCi = /RUN\s+npm\s+(ci|install)/i.test(builderStage);
  const builderHasSourceCopy = /COPY\s+(\.\s+\.|\.\/\s+\.\/)/i.test(builderStage);
  const builderHasNpmBuild = /RUN\s+(npm\s+run\s+build|npx\s+tsc)/i.test(builderStage);

  if (!builderHasWorkdir) {
    checks[1].message = "L'étape builder doit définir un répertoire de travail avec 'WORKDIR /app'.";
  } else if (!builderHasPackageCopy || !builderHasNpmCi) {
    checks[1].message = 'L’étape builder doit copier package*.json et exécuter npm ci pour optimiser la mise en cache.';
  } else if (!builderHasSourceCopy || !builderHasNpmBuild) {
    checks[1].message = 'L’étape builder doit copier le code source et lancer la commande de compilation (npm run build).';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Étape builder : WORKDIR, cache des dépendances npm ci et compilation validés.';
  }

  // 3. Étape Production (production_stage_copy_and_env)
  const prodHasEnv = /ENV\s+(NODE_ENV(=|\s+)production|PORT(=|\s+)3000)/i.test(prodStage);
  const prodHasCopyFromBuilder = /COPY\s+--from=(builder|build)\s+/i.test(prodStage);
  const prodHasExpose = /EXPOSE\s+3000\b/i.test(prodStage);

  if (!prodHasCopyFromBuilder) {
    checks[2].message = "L'étape de production doit récupérer les fichiers compilés avec 'COPY --from=builder /app/dist ./dist'.";
  } else if (!prodHasEnv) {
    checks[2].message = "La variable d'environnement 'ENV NODE_ENV=production' est requise dans l'image de production.";
  } else if (!prodHasExpose) {
    checks[2].message = "Le port d'écoute 'EXPOSE 3000' doit être documenté dans l'image de production.";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Étape production : copie sélective depuis le builder, variable ENV et EXPOSE 3000 validés.';
  }

  // 4. Sécurité non-root et CMD exec (security_non_root_and_cmd_exec)
  const prodHasUserNode = /USER\s+(node|[0-9]+)/i.test(prodStage);
  const prodHasCmdExec = /CMD\s*\[\s*"node"/i.test(prodStage) || /ENTRYPOINT\s*\[\s*"node"/i.test(prodStage);

  if (!prodHasUserNode) {
    checks[3].message = "Sécurité critique : l'instruction 'USER node' est obligatoire pour ne pas exécuter l'application en root.";
  } else if (!prodHasCmdExec) {
    checks[3].message = "L'instruction CMD doit utiliser la forme exec JSON (ex: CMD [\"node\", \"dist/main.js\"]) pour la gestion propre des signaux PID 1.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Sécurité non-root (USER node) et commande de démarrage CMD au format exec JSON validées.';
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
  const verdict = validateDockerfile(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
