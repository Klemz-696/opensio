#!/usr/bin/env node

/**
 * Validateur du lab "Conception d'un Pipeline CI/CD Complet (GitHub Actions)"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D) - Pure Node.js sans dépendances externes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateGitHubActionsWorkflow(workDir = '/work') {
  let filePath = join(workDir, 'deploy.yml');
  if (!existsSync(filePath)) {
    filePath = join(workDir, '.github', 'workflows', 'deploy.yml');
  }

  const checks = [
    { id: 'triggers_and_jobs_structure', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'test_job_steps_and_cache', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'deploy_job_needs_and_condition', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'artifacts_and_secrets_security', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier deploy.yml introuvable dans le répertoire de travail.';
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

  // Ignorer les commentaires pour l'analyse
  const cleanContent = rawContent
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

  // 1. Déclencheurs et structure des jobs (triggers_and_jobs_structure)
  const hasPushTrigger = /push:[\s\S]*?(main|branches)/i.test(cleanContent);
  const hasPrTrigger = /pull_request:[\s\S]*?(main|branches)/i.test(cleanContent);
  const hasUbuntuLatest = /runs-on:\s*ubuntu-latest/i.test(cleanContent);
  const hasTestJob = /^\s*test:\s*$/m.test(cleanContent);
  const hasDeployJob = /^\s*(deploy|build-and-deploy|release):\s*$/m.test(cleanContent);

  if (!hasPushTrigger || !hasPrTrigger) {
    checks[0].message = "Les déclencheurs 'push' et 'pull_request' sur la branche 'main' doivent être déclarés sous 'on:'.";
  } else if (!hasTestJob || !hasDeployJob) {
    checks[0].message = "Les deux jobs 'test' et 'deploy' doivent être définis sous 'jobs:'.";
  } else if (!hasUbuntuLatest) {
    checks[0].message = "Les jobs doivent s'exécuter sur 'runs-on: ubuntu-latest'.";
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Déclencheurs (push/PR main) et structure des jobs (test/deploy) validés.';
  }

  // Découpage des blocs de jobs
  const extractJobBlock = (jobName) => {
    const lines = cleanContent.split('\n');
    let inside = false;
    const blockLines = [];

    for (const line of lines) {
      const isJobStart = new RegExp(`^[ \\t]{2}${jobName}:[ \\t]*$`).test(line);
      const isOtherJobOrRoot = /^[ \t]{0,2}[a-zA-Z0-9_-]+:[ \t]*$/.test(line);

      if (isJobStart) {
        inside = true;
        continue;
      }

      if (inside) {
        if (isOtherJobOrRoot) {
          break;
        }
        blockLines.push(line);
      }
    }

    return blockLines.join('\n');
  };

  const testBlock = extractJobBlock('test');
  const deployBlock = extractJobBlock('deploy') || extractJobBlock('build-and-deploy');

  // 2. Étapes du job TEST (test_job_steps_and_cache)
  const testHasCheckout = /uses:\s*actions\/checkout@v\d+/i.test(testBlock);
  const testHasSetupNode = /uses:\s*actions\/setup-node@v\d+/i.test(testBlock);
  const testHasNpmCi = /run:[\s\S]*?npm\s+ci/i.test(testBlock);
  const testHasLint = /run:[\s\S]*?npm\s+run\s+(lint|typecheck)/i.test(testBlock);
  const testHasTest = /run:[\s\S]*?npm\s+test/i.test(testBlock);

  if (!testHasCheckout || !testHasSetupNode) {
    checks[1].message = "Le job test doit inclure 'actions/checkout' et 'actions/setup-node'.";
  } else if (!testHasNpmCi || !testHasLint || !testHasTest) {
    checks[1].message = "Le job test doit exécuter les commandes 'npm ci', 'npm run lint' et 'npm test'.";
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Job test complet : checkout, setup-node, npm ci, lint et exécution des tests validés.';
  }

  // 3. Dépendance et condition du job DEPLOY (deploy_job_needs_and_condition)
  const deployHasNeeds = /needs:\s*(\[\s*test\s*\]|test\b)/i.test(deployBlock);
  const deployHasIfCondition = /if:[\s\S]*?(main|refs\/heads\/main|push)/i.test(deployBlock);

  if (!deployHasNeeds) {
    checks[2].message = "Le job deploy doit comporter la directive 'needs: test' pour dépendre du succès des tests.";
  } else if (!deployHasIfCondition) {
    checks[2].message = "Le job deploy doit être conditionné à la branche main (ex: if: github.ref == 'refs/heads/main').";
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Dépendance séquentielle (needs: test) et conditionnement à la branche main validés.';
  }

  // 4. Artefacts et Secrets (artifacts_and_secrets_security)
  const deployHasUploadArtifact = /uses:\s*actions\/upload-artifact@v\d+/i.test(deployBlock);
  const deployHasSecretUsage = /\$\{\{\s*secrets\.[a-zA-Z0-9_]+\s*\}\}/i.test(cleanContent);

  if (!deployHasUploadArtifact) {
    checks[3].message = "L'étape de téléversement des artefacts 'actions/upload-artifact@v4' est requise dans le job de déploiement.";
  } else if (!deployHasSecretUsage) {
    checks[3].message = "L'étape de déploiement doit faire référence à un secret de dépôt chiffré via '${{ secrets.NOM_SECRET }}'.";
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Archivage des artefacts (upload-artifact) et utilisation sécurisée des secrets validées.';
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
  const verdict = validateGitHubActionsWorkflow(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
