#!/usr/bin/env node

/**
 * Script de validation globale autonome du catalogue OpenSIO
 * Valide :
 * 1. Tous les fichiers track.yaml, module.yaml, leçons .md, quiz .yaml, labs .yaml
 * 2. L'intégrité référentielle des slugs et relations croisées
 * 3. L'exécution de chaque validateur de lab sur ses solutions d'essais (valid & invalid)
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contentRoot = resolve(__dirname);
const workspaceRoot = resolve(__dirname, '..');

async function loadSchemaPackage() {
  const distPath = join(workspaceRoot, 'packages', 'content-schema', 'dist', 'index.js');
  if (existsSync(distPath)) {
    return await import(pathToFileURL(distPath).href);
  }
  throw new Error(`Package content-schema non trouvé à ${distPath}. Exécutez 'pnpm --filter @opensio/content-schema build' au préalable.`);
}

async function runValidation() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m[OpenSIO Content Validator] Validation du catalogue\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  const schema = await loadSchemaPackage();
  const {
    TrackSchema,
    ModuleSchema,
    LessonFrontMatterSchema,
    QuizSchema,
    LabSchema,
    parseYamlContent,
    parseMarkdownContent,
  } = schema;

  const errors = [];
  const stats = {
    tracks: 0,
    modules: 0,
    lessons: 0,
    quizzes: 0,
    quizQuestions: 0,
    labs: 0,
    labTestsRun: 0,
    labTestsPassed: 0,
  };

  const tracksDir = join(contentRoot, 'tracks');
  if (!existsSync(tracksDir)) {
    console.error('\x1b[31m[ERREUR]\x1b[0m Répertoire content/tracks introuvable.');
    process.exit(1);
  }

  const allSlugs = {
    tracks: new Set(),
    modules: new Set(),
    lessons: new Set(),
    quizzes: new Set(),
    labs: new Set(),
  };

  const tracks = [];

  const trackFolders = readdirSync(tracksDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const tf of trackFolders) {
    const trackDirPath = join(tracksDir, tf.name);
    const trackYamlPath = join(trackDirPath, 'track.yaml');

    if (!existsSync(trackYamlPath)) {
      errors.push(`Track ${tf.name} : track.yaml manquant.`);
      continue;
    }

    const rawTrackYaml = readFileSync(trackYamlPath, 'utf-8');
    const trackRes = parseYamlContent(rawTrackYaml, TrackSchema, `tracks/${tf.name}/track.yaml`);
    if (!trackRes.success) {
      errors.push(...trackRes.errors.map((e) => `[Track ${tf.name}] ${e.field}: ${e.message}`));
      continue;
    }

    stats.tracks++;
    const trackData = trackRes.data;
    if (allSlugs.tracks.has(trackData.slug)) {
      errors.push(`Slug de track en doublon : "${trackData.slug}"`);
    }
    allSlugs.tracks.add(trackData.slug);

    const modules = [];
    const modulesDir = join(trackDirPath, 'modules');
    if (existsSync(modulesDir)) {
      const moduleFolders = readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      for (const mf of moduleFolders) {
        const modDirPath = join(modulesDir, mf.name);
        const modYamlPath = join(modDirPath, 'module.yaml');

        if (!existsSync(modYamlPath)) {
          errors.push(`Module ${mf.name} : module.yaml manquant.`);
          continue;
        }

        const rawModYaml = readFileSync(modYamlPath, 'utf-8');
        const modRes = parseYamlContent(rawModYaml, ModuleSchema, `tracks/${tf.name}/modules/${mf.name}/module.yaml`);
        if (!modRes.success) {
          errors.push(...modRes.errors.map((e) => `[Module ${mf.name}] ${e.field}: ${e.message}`));
          continue;
        }

        stats.modules++;
        const modData = modRes.data;
        if (allSlugs.modules.has(modData.slug)) {
          errors.push(`Slug de module en doublon : "${modData.slug}"`);
        }
        allSlugs.modules.add(modData.slug);

        const modLessons = new Set();
        const modQuizzes = new Set();
        const modLabs = new Set();

        // 1. Leçons
        const lessonsDir = join(modDirPath, 'lessons');
        if (existsSync(lessonsDir)) {
          const lessonFiles = readdirSync(lessonsDir).filter((f) => f.endsWith('.md'));
          for (const lf of lessonFiles) {
            const lfPath = join(lessonsDir, lf);
            const rawLesson = readFileSync(lfPath, 'utf-8');
            const lessonRes = parseMarkdownContent(rawLesson, LessonFrontMatterSchema, lf);

            if (!lessonRes.success) {
              errors.push(...lessonRes.errors.map((e) => `[Leçon ${lf}] ${e.field}: ${e.message}`));
            } else {
              stats.lessons++;
              const lSlug = lessonRes.frontMatter.slug;
              if (allSlugs.lessons.has(lSlug)) {
                errors.push(`Slug de leçon en doublon : "${lSlug}" (${lf})`);
              }
              allSlugs.lessons.add(lSlug);
              modLessons.add(lSlug);

              for (const labRef of lessonRes.frontMatter.labs) {
                if (!labRef.slug) {
                  errors.push(`[Leçon ${lf}] Référence de lab sans slug.`);
                }
              }
            }
          }
        }

        // 2. Quiz
        const quizzesDir = join(modDirPath, 'quizzes');
        if (existsSync(quizzesDir)) {
          const quizFiles = readdirSync(quizzesDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
          for (const qf of quizFiles) {
            const qfPath = join(quizzesDir, qf);
            const rawQuiz = readFileSync(qfPath, 'utf-8');
            const quizRes = parseYamlContent(rawQuiz, QuizSchema, qf);

            if (!quizRes.success) {
              errors.push(...quizRes.errors.map((e) => `[Quiz ${qf}] ${e.field}: ${e.message}`));
            } else {
              stats.quizzes++;
              const qSlug = quizRes.data.slug;
              if (allSlugs.quizzes.has(qSlug)) {
                errors.push(`Slug de quiz en doublon : "${qSlug}" (${qf})`);
              }
              allSlugs.quizzes.add(qSlug);
              modQuizzes.add(qSlug);
              stats.quizQuestions += quizRes.data.questions.length;

              for (let qi = 0; qi < quizRes.data.questions.length; qi++) {
                const q = quizRes.data.questions[qi];
                if (!q.explanation || q.explanation.trim().length === 0) {
                  errors.push(`[Quiz ${qf}] Question #${qi + 1} : explication pédagogique manquante.`);
                }
              }
            }
          }
        }

        // 3. Labs
        const labsDir = join(modDirPath, 'labs');
        if (existsSync(labsDir)) {
          const labFolders = readdirSync(labsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
          for (const labf of labFolders) {
            const labDirPath = join(labsDir, labf.name);
            const labYamlPath = join(labDirPath, 'lab.yaml');

            if (!existsSync(labYamlPath)) {
              errors.push(`Lab ${labf.name} : lab.yaml manquant.`);
              continue;
            }

            const rawLab = readFileSync(labYamlPath, 'utf-8');
            const labRes = parseYamlContent(rawLab, LabSchema, `labs/${labf.name}/lab.yaml`);

            if (!labRes.success) {
              errors.push(...labRes.errors.map((e) => `[Lab ${labf.name}] ${e.field}: ${e.message}`));
            } else {
              stats.labs++;
              const labSlug = labRes.data.slug;
              if (allSlugs.labs.has(labSlug)) {
                errors.push(`Slug de lab en doublon : "${labSlug}" (${labf.name})`);
              }
              allSlugs.labs.add(labSlug);
              modLabs.add(labSlug);

              if (labRes.data.validation && labRes.data.validation.checks) {
                const totalPoints = labRes.data.validation.checks.reduce((s, c) => s + (c.points || 0), 0);
                if (totalPoints !== labRes.data.max_score) {
                  errors.push(`[Lab ${labf.name}] La somme des points des checks (${totalPoints}) ne correspond pas au max_score (${labRes.data.max_score}).`);
                }
              }

              // Tester le validateur du lab par exécution CLI
              const validatorPath = join(labDirPath, 'validator', 'validate.mjs');
              if (existsSync(validatorPath)) {
                const solutionsDir = join(labDirPath, 'validator', 'solutions');
                if (existsSync(solutionsDir)) {
                  const solEntries = readdirSync(solutionsDir, { withFileTypes: true });
                  for (const sol of solEntries) {
                    if (!sol.isDirectory()) continue;
                    const solPath = join(solutionsDir, sol.name);
                    stats.labTestsRun++;

                    const execResult = spawnSync(process.execPath, [validatorPath, solPath], {
                      encoding: 'utf-8',
                      timeout: 10000,
                      env: { ...process.env, WORK_DIR: solPath },
                    });

                    if (execResult.error) {
                      errors.push(`[Lab ${labf.name}] Échec d'exécution du validateur sur ${sol.name} : ${execResult.error.message}`);
                      continue;
                    }

                    try {
                      const verdict = JSON.parse(execResult.stdout.trim());
                      if (sol.name === 'valid') {
                        if (!verdict.passed || verdict.score < (labRes.data.scoring?.floor_percent || 50)) {
                          errors.push(`[Lab ${labf.name}] Fixture solutions/valid a échoué (passed: ${verdict.passed}, score: ${verdict.score}).`);
                        } else {
                          stats.labTestsPassed++;
                        }
                      } else if (sol.name.startsWith('invalid')) {
                        if (verdict.passed) {
                          errors.push(`[Lab ${labf.name}] Fixture solutions/${sol.name} a été acceptée à tort comme valide (passed: true).`);
                        } else {
                          stats.labTestsPassed++;
                        }
                      }
                    } catch (pErr) {
                      errors.push(`[Lab ${labf.name}] Sortie non JSON sur fixture ${sol.name} : ${execResult.stdout} ${execResult.stderr}`);
                    }
                  }
                }
              }
            }
          }
        }

        // Vérification des déclarations dans module.yaml
        for (const l of modData.lessons) {
          if (!modLessons.has(l)) {
            errors.push(`[Module ${mf.name}] Leçon déclarée "${l}" introuvable dans le dossier lessons/`);
          }
        }
        for (const q of modData.quizzes) {
          if (!modQuizzes.has(q)) {
            errors.push(`[Module ${mf.name}] Quiz déclaré "${q}" introuvable dans le dossier quizzes/`);
          }
        }
        for (const l of modData.labs) {
          if (!modLabs.has(l)) {
            errors.push(`[Module ${mf.name}] Lab déclaré "${l}" introuvable dans le dossier labs/`);
          }
        }

        modules.push({ modData, modLessons, modQuizzes, modLabs });
      }
    }

    tracks.push({ trackData, modules });
  }

  // Affichage du Bilan
  console.log('--- Statistiques du Catalogue analysé ---');
  console.log(`Parcours (Tracks)  : ${stats.tracks}`);
  console.log(`Modules            : ${stats.modules}`);
  console.log(`Leçons             : ${stats.lessons}`);
  console.log(`Quiz               : ${stats.quizzes} (${stats.quizQuestions} questions)`);
  console.log(`Ateliers (Labs)    : ${stats.labs}`);
  console.log(`Tests validateurs  : ${stats.labTestsPassed} / ${stats.labTestsRun} passants\n`);

  if (errors.length > 0) {
    console.error(`\x1b[31m[ÉCHEC]\x1b[0m ${errors.length} erreur(s) de validation détectée(s) :\n`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error('\n');
    process.exit(1);
  }

  console.log('\x1b[32m[SUCCÈS]\x1b[0m 100 % du catalogue est valide et conforme aux spécifications OpenSIO !\n');
  process.exit(0);
}

runValidation().catch((err) => {
  console.error('\x1b[31m[CRASH]\x1b[0m Erreur inattendue :', err);
  process.exit(1);
});
