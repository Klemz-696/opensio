import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import {
  TrackSchema,
  ModuleSchema,
  LessonFrontMatterSchema,
  QuizSchema,
  LabSchema,
  parseYamlContent,
  parseMarkdownContent,
  LocalizedValidationError,
} from '@opensio/content-schema';
import type {
  ScannedContent,
  ScannedTrack,
  ScannedModule,
  ScannedLesson,
  ScannedQuiz,
  ScannedLab,
} from './types.js';

function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
}

function normalizeRelPath(baseDir: string, fullPath: string): string {
  return relative(baseDir, fullPath).replace(/\\/g, '/');
}

export function scanContentDirectory(contentDir: string): ScannedContent {
  const errors: LocalizedValidationError[] = [];
  const tracks: ScannedTrack[] = [];

  const tracksDir = join(contentDir, 'tracks');
  if (!existsSync(tracksDir)) {
    return { tracks, errors };
  }

  const trackEntries = readdirSync(tracksDir, { withFileTypes: true });
  for (const trackEntry of trackEntries) {
    if (!trackEntry.isDirectory()) continue;

    const trackDirPath = join(tracksDir, trackEntry.name);
    const trackYamlPath = join(trackDirPath, 'track.yaml');
    const relTrackYaml = normalizeRelPath(contentDir, trackYamlPath);

    if (!existsSync(trackYamlPath)) {
      errors.push({
        filePath: relTrackYaml,
        field: '(fichier)',
        message: `Fichier track.yaml manquant dans le dossier ${trackEntry.name}`,
      });
      continue;
    }

    const rawTrackYaml = readFileSync(trackYamlPath, 'utf-8');
    const trackParse = parseYamlContent(rawTrackYaml, TrackSchema, relTrackYaml);
    if (!trackParse.success) {
      errors.push(...trackParse.errors);
      continue;
    }

    const scannedModules: ScannedModule[] = [];
    const modulesDir = join(trackDirPath, 'modules');

    if (existsSync(modulesDir)) {
      const moduleEntries = readdirSync(modulesDir, { withFileTypes: true });
      for (const modEntry of moduleEntries) {
        if (!modEntry.isDirectory()) continue;

        const modDirPath = join(modulesDir, modEntry.name);
        const modYamlPath = join(modDirPath, 'module.yaml');
        const relModYaml = normalizeRelPath(contentDir, modYamlPath);

        if (!existsSync(modYamlPath)) {
          errors.push({
            filePath: relModYaml,
            field: '(fichier)',
            message: `Fichier module.yaml manquant dans le dossier ${modEntry.name}`,
          });
          continue;
        }

        const rawModYaml = readFileSync(modYamlPath, 'utf-8');
        const modParse = parseYamlContent(rawModYaml, ModuleSchema, relModYaml);
        if (!modParse.success) {
          errors.push(...modParse.errors);
          continue;
        }

        // Leçons
        const scannedLessons: ScannedLesson[] = [];
        const lessonsDir = join(modDirPath, 'lessons');
        if (existsSync(lessonsDir)) {
          const lessonFiles = readdirSync(lessonsDir).filter((f) => f.endsWith('.md'));
          for (const lf of lessonFiles) {
            const lfPath = join(lessonsDir, lf);
            const relLf = normalizeRelPath(contentDir, lfPath);
            const rawLesson = readFileSync(lfPath, 'utf-8');
            const lessonParse = parseMarkdownContent(rawLesson, LessonFrontMatterSchema, relLf);

            if (!lessonParse.success) {
              errors.push(...lessonParse.errors);
            } else {
              scannedLessons.push({
                frontMatter: lessonParse.frontMatter,
                body: lessonParse.body,
                relativePath: relLf,
                gitHash: computeHash(rawLesson),
              });
            }
          }
        }

        // Quiz
        const scannedQuizzes: ScannedQuiz[] = [];
        const quizzesDir = join(modDirPath, 'quizzes');
        if (existsSync(quizzesDir)) {
          const quizFiles = readdirSync(quizzesDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
          for (const qf of quizFiles) {
            const qfPath = join(quizzesDir, qf);
            const relQf = normalizeRelPath(contentDir, qfPath);
            const rawQuiz = readFileSync(qfPath, 'utf-8');
            const quizParse = parseYamlContent(rawQuiz, QuizSchema, relQf);

            if (!quizParse.success) {
              errors.push(...quizParse.errors);
            } else {
              scannedQuizzes.push({
                quiz: quizParse.data,
                relativePath: relQf,
              });
            }
          }
        }

        // Labs
        const scannedLabs: ScannedLab[] = [];
        const labsDir = join(modDirPath, 'labs');
        if (existsSync(labsDir)) {
          const labEntries = readdirSync(labsDir, { withFileTypes: true });
          for (const labEntry of labEntries) {
            if (!labEntry.isDirectory()) continue;
            const labYamlPath = join(labsDir, labEntry.name, 'lab.yaml');
            const relLabYaml = normalizeRelPath(contentDir, labYamlPath);

            if (!existsSync(labYamlPath)) {
              errors.push({
                filePath: relLabYaml,
                field: '(fichier)',
                message: `Fichier lab.yaml manquant dans le dossier ${labEntry.name}`,
              });
              continue;
            }

            const rawLabYaml = readFileSync(labYamlPath, 'utf-8');
            const labParse = parseYamlContent(rawLabYaml, LabSchema, relLabYaml);
            if (!labParse.success) {
              errors.push(...labParse.errors);
            } else {
              scannedLabs.push({
                lab: labParse.data,
                relativePath: relLabYaml,
                gitHash: computeHash(rawLabYaml),
              });
            }
          }
        }

        scannedModules.push({
          module: modParse.data,
          relativePath: relModYaml,
          gitHash: computeHash(rawModYaml),
          lessons: scannedLessons,
          quizzes: scannedQuizzes,
          labs: scannedLabs,
        });
      }
    }

    tracks.push({
      track: trackParse.data,
      relativePath: relTrackYaml,
      gitHash: computeHash(rawTrackYaml),
      modules: scannedModules,
    });
  }

  return { tracks, errors };
}
