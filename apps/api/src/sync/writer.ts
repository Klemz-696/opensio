import { PrismaClient, Prisma } from '@prisma/client';
import type { ScannedContent, SyncReport } from './types.js';
import { createInitialStats, mapLabLevel, mapQuestionKind } from './writer-mappers.js';
import { cleanupObsoleteEntities } from './writer-cleanup.js';

export async function writeScannedContentToDatabase(
  prisma: PrismaClient,
  scanned: ScannedContent
): Promise<SyncReport['stats']> {
  const stats: SyncReport['stats'] = {
    tracks: createInitialStats(),
    modules: createInitialStats(),
    lessons: createInitialStats(),
    quizzes: createInitialStats(),
    quizQuestions: createInitialStats(),
    labs: createInitialStats(),
    lessonLabs: createInitialStats(),
  };

  await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const activeTrackSlugs = new Set<string>();
      const activeModuleSlugs = new Set<string>();
      const activeLessonSlugs = new Set<string>();
      const activeQuizSlugs = new Set<string>();
      const activeLabSlugs = new Set<string>();

      // 1. Synchronisation des Tracks
      for (const st of scanned.tracks) {
        activeTrackSlugs.add(st.track.slug);
        const existing = await tx.track.findUnique({ where: { slug: st.track.slug } });

        let trackRecord;
        if (!existing) {
          trackRecord = await tx.track.create({
            data: {
              slug: st.track.slug,
              title: st.track.title,
              description: st.track.description ?? null,
              position: st.track.position,
              gitHash: st.gitHash,
              syncedAt: new Date(),
            },
          });
          stats.tracks.created++;
        } else {
          trackRecord = await tx.track.update({
            where: { slug: st.track.slug },
            data: {
              title: st.track.title,
              description: st.track.description ?? null,
              position: st.track.position,
              gitHash: st.gitHash,
              syncedAt: new Date(),
            },
          });
          if (existing.gitHash !== st.gitHash || existing.title !== st.track.title) {
            stats.tracks.updated++;
          } else {
            stats.tracks.unchanged++;
          }
        }

        // 2. Synchronisation des Modules
        for (const sm of st.modules) {
          activeModuleSlugs.add(sm.module.slug);
          const existingMod = await tx.module.findUnique({ where: { slug: sm.module.slug } });

          let modRecord;
          if (!existingMod) {
            modRecord = await tx.module.create({
              data: {
                trackId: trackRecord.id,
                slug: sm.module.slug,
                title: sm.module.title,
                description: sm.module.description ?? null,
                position: sm.module.position,
                difficulty: sm.module.difficulty,
                estimatedMinutes: sm.module.estimated_minutes,
                competencyRefs: sm.module.competency_refs,
                gitHash: sm.gitHash,
              },
            });
            stats.modules.created++;
          } else {
            modRecord = await tx.module.update({
              where: { slug: sm.module.slug },
              data: {
                trackId: trackRecord.id,
                title: sm.module.title,
                description: sm.module.description ?? null,
                position: sm.module.position,
                difficulty: sm.module.difficulty,
                estimatedMinutes: sm.module.estimated_minutes,
                competencyRefs: sm.module.competency_refs,
                gitHash: sm.gitHash,
              },
            });
            if (existingMod.gitHash !== sm.gitHash || existingMod.title !== sm.module.title) {
              stats.modules.updated++;
            } else {
              stats.modules.unchanged++;
            }
          }

          // 3. Synchronisation des Leçons
          for (let lIdx = 0; lIdx < sm.lessons.length; lIdx++) {
            const sl = sm.lessons[lIdx];
            activeLessonSlugs.add(sl.frontMatter.slug);
            const existingLesson = await tx.lesson.findUnique({ where: { slug: sl.frontMatter.slug } });

            if (!existingLesson) {
              await tx.lesson.create({
                data: {
                  moduleId: modRecord.id,
                  slug: sl.frontMatter.slug,
                  title: sl.frontMatter.title,
                  objectives: sl.frontMatter.objectives,
                  prerequisites: sl.frontMatter.prerequisites,
                  difficulty: sl.frontMatter.difficulty,
                  estimatedMinutes: sl.frontMatter.estimated_minutes,
                  contentPath: sl.relativePath,
                  successCriteria: sl.frontMatter.success_criteria,
                  position: lIdx + 1,
                  gitHash: sl.gitHash,
                },
              });
              stats.lessons.created++;
            } else {
              await tx.lesson.update({
                where: { slug: sl.frontMatter.slug },
                data: {
                  moduleId: modRecord.id,
                  title: sl.frontMatter.title,
                  objectives: sl.frontMatter.objectives,
                  prerequisites: sl.frontMatter.prerequisites,
                  difficulty: sl.frontMatter.difficulty,
                  estimatedMinutes: sl.frontMatter.estimated_minutes,
                  contentPath: sl.relativePath,
                  successCriteria: sl.frontMatter.success_criteria,
                  position: lIdx + 1,
                  gitHash: sl.gitHash,
                },
              });
              if (existingLesson.gitHash !== sl.gitHash || existingLesson.title !== sl.frontMatter.title) {
                stats.lessons.updated++;
              } else {
                stats.lessons.unchanged++;
              }
            }
          }

          // 4. Synchronisation des Labs
          for (const slab of sm.labs) {
            activeLabSlugs.add(slab.lab.slug);
            const existingLab = await tx.lab.findUnique({ where: { slug: slab.lab.slug } });

            if (!existingLab) {
              await tx.lab.create({
                data: {
                  moduleId: modRecord.id,
                  slug: slab.lab.slug,
                  title: slab.lab.title,
                  level: mapLabLevel(slab.lab.level),
                  definitionPath: slab.relativePath,
                  maxScore: slab.lab.max_score,
                  estimatedMinutes: slab.lab.estimated_minutes,
                  gitHash: slab.gitHash,
                },
              });
              stats.labs.created++;
            } else {
              await tx.lab.update({
                where: { slug: slab.lab.slug },
                data: {
                  moduleId: modRecord.id,
                  title: slab.lab.title,
                  level: mapLabLevel(slab.lab.level),
                  definitionPath: slab.relativePath,
                  maxScore: slab.lab.max_score,
                  estimatedMinutes: slab.lab.estimated_minutes,
                  gitHash: slab.gitHash,
                },
              });
              if (existingLab.gitHash !== slab.gitHash || existingLab.title !== slab.lab.title) {
                stats.labs.updated++;
              } else {
                stats.labs.unchanged++;
              }
            }
          }

          // 5. Synchronisation des Quiz & Questions
          for (const sq of sm.quizzes) {
            activeQuizSlugs.add(sq.quiz.slug);
            const existingQuiz = await tx.quiz.findUnique({ where: { slug: sq.quiz.slug } });

            let quizRecord;
            if (!existingQuiz) {
              quizRecord = await tx.quiz.create({
                data: {
                  moduleId: modRecord.id,
                  slug: sq.quiz.slug,
                  title: sq.quiz.title,
                  passingScore: sq.quiz.passing_score,
                  position: sq.quiz.position,
                },
              });
              stats.quizzes.created++;
            } else {
              quizRecord = await tx.quiz.update({
                where: { slug: sq.quiz.slug },
                data: {
                  moduleId: modRecord.id,
                  title: sq.quiz.title,
                  passingScore: sq.quiz.passing_score,
                  position: sq.quiz.position,
                },
              });
              if (existingQuiz.title !== sq.quiz.title || existingQuiz.passingScore !== sq.quiz.passing_score) {
                stats.quizzes.updated++;
              } else {
                stats.quizzes.unchanged++;
              }
            }

            await tx.quizQuestion.deleteMany({ where: { quizId: quizRecord.id } });
            for (let qIdx = 0; qIdx < sq.quiz.questions.length; qIdx++) {
              const q = sq.quiz.questions[qIdx];
              await tx.quizQuestion.create({
                data: {
                  quizId: quizRecord.id,
                  kind: mapQuestionKind(q.kind),
                  prompt: q.prompt,
                  choices: q.choices,
                  correctChoiceIds: q.correct,
                  explanation: q.explanation ?? null,
                  position: q.position ?? qIdx + 1,
                },
              });
              stats.quizQuestions.created++;
            }
          }
        }
      }

      // 6. Peuplement de lesson_labs
      for (const st of scanned.tracks) {
        for (const sm of st.modules) {
          for (const sl of sm.lessons) {
            const lesson = await tx.lesson.findUnique({ where: { slug: sl.frontMatter.slug } });
            if (!lesson) continue;

            await tx.lessonLab.deleteMany({ where: { lessonId: lesson.id } });

            for (let i = 0; i < sl.frontMatter.labs.length; i++) {
              const labRef = sl.frontMatter.labs[i];
              const lab = await tx.lab.findUnique({ where: { slug: labRef.slug } });
              if (lab) {
                await tx.lessonLab.create({
                  data: {
                    lessonId: lesson.id,
                    labId: lab.id,
                    required: labRef.required,
                    position: labRef.position ?? i + 1,
                  },
                });
                stats.lessonLabs.created++;
              }
            }
          }
        }
      }

      // 7. Nettoyage des éléments obsolètes
      await cleanupObsoleteEntities(
        tx,
        {
          trackSlugs: activeTrackSlugs,
          moduleSlugs: activeModuleSlugs,
          lessonSlugs: activeLessonSlugs,
          quizSlugs: activeQuizSlugs,
          labSlugs: activeLabSlugs,
        },
        stats
      );
    },
    { timeout: 30000 }
  );

  return stats;
}
