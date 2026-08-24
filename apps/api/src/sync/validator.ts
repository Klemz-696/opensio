import type { LocalizedValidationError } from '@opensio/content-schema';
import type { ScannedContent } from './types.js';

export function validateScannedContent(scanned: ScannedContent): LocalizedValidationError[] {
  const errors: LocalizedValidationError[] = [...scanned.errors];

  const trackSlugs = new Set<string>();
  const moduleSlugs = new Set<string>();
  const lessonSlugs = new Set<string>();
  const quizSlugs = new Set<string>();
  const labSlugs = new Set<string>();

  // Collecter tous les slugs existants pour vérifier l'unicité globale
  for (const track of scanned.tracks) {
    if (trackSlugs.has(track.track.slug)) {
      errors.push({
        filePath: track.relativePath,
        field: 'slug',
        message: `Le slug de track "${track.track.slug}" est en doublon`,
      });
    }
    trackSlugs.add(track.track.slug);

    for (const mod of track.modules) {
      if (moduleSlugs.has(mod.module.slug)) {
        errors.push({
          filePath: mod.relativePath,
          field: 'slug',
          message: `Le slug de module "${mod.module.slug}" est en doublon`,
        });
      }
      moduleSlugs.add(mod.module.slug);

      for (const lesson of mod.lessons) {
        if (lessonSlugs.has(lesson.frontMatter.slug)) {
          errors.push({
            filePath: lesson.relativePath,
            field: 'slug',
            message: `Le slug de leçon "${lesson.frontMatter.slug}" est en doublon`,
          });
        }
        lessonSlugs.add(lesson.frontMatter.slug);
      }

      for (const quiz of mod.quizzes) {
        if (quizSlugs.has(quiz.quiz.slug)) {
          errors.push({
            filePath: quiz.relativePath,
            field: 'slug',
            message: `Le slug de quiz "${quiz.quiz.slug}" est en doublon`,
          });
        }
        quizSlugs.add(quiz.quiz.slug);
      }

      for (const lab of mod.labs) {
        if (labSlugs.has(lab.lab.slug)) {
          errors.push({
            filePath: lab.relativePath,
            field: 'slug',
            message: `Le slug de lab "${lab.lab.slug}" est en doublon`,
          });
        }
        labSlugs.add(lab.lab.slug);
      }
    }
  }

  // Vérifier la cohérence des références croisées
  for (const track of scanned.tracks) {
    for (const mod of track.modules) {
      const moduleLessonSlugs = new Set(mod.lessons.map((l) => l.frontMatter.slug));
      const moduleQuizSlugs = new Set(mod.quizzes.map((q) => q.quiz.slug));
      const moduleLabSlugs = new Set(mod.labs.map((l) => l.lab.slug));

      for (const lessonSlug of mod.module.lessons) {
        if (!moduleLessonSlugs.has(lessonSlug)) {
          errors.push({
            filePath: mod.relativePath,
            field: `lessons.${lessonSlug}`,
            message: `La leçon déclarée "${lessonSlug}" n'a pas été trouvée dans le module`,
          });
        }
      }

      for (const quizSlug of mod.module.quizzes) {
        if (!moduleQuizSlugs.has(quizSlug)) {
          errors.push({
            filePath: mod.relativePath,
            field: `quizzes.${quizSlug}`,
            message: `Le quiz déclaré "${quizSlug}" n'a pas été trouvé dans le module`,
          });
        }
      }

      for (const labSlug of mod.module.labs) {
        if (!moduleLabSlugs.has(labSlug)) {
          errors.push({
            filePath: mod.relativePath,
            field: `labs.${labSlug}`,
            message: `Le lab déclaré "${labSlug}" n'a pas été trouvé dans le module`,
          });
        }
      }

      // Vérifier les références de labs dans les leçons
      for (const lesson of mod.lessons) {
        for (const labRef of lesson.frontMatter.labs) {
          if (!labSlugs.has(labRef.slug)) {
            errors.push({
              filePath: lesson.relativePath,
              field: `labs.${labRef.slug}`,
              message: `Le lab associé "${labRef.slug}" n'existe nulle part dans le contenu`,
            });
          }
        }
      }
    }
  }

  return errors;
}
