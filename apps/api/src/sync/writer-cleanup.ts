import { Prisma } from '@prisma/client';
import type { SyncReport } from './types.js';

export interface ActiveSlugs {
  trackSlugs: Set<string>;
  moduleSlugs: Set<string>;
  lessonSlugs: Set<string>;
  quizSlugs: Set<string>;
  labSlugs: Set<string>;
}

export async function cleanupObsoleteEntities(
  tx: Prisma.TransactionClient,
  activeSlugs: ActiveSlugs,
  stats: SyncReport['stats']
): Promise<void> {
  const delLessons = await tx.lesson.deleteMany({
    where: { slug: { notIn: Array.from(activeSlugs.lessonSlugs) } },
  });
  stats.lessons.deleted = delLessons.count;

  const delLabs = await tx.lab.deleteMany({
    where: { slug: { notIn: Array.from(activeSlugs.labSlugs) } },
  });
  stats.labs.deleted = delLabs.count;

  const delQuizzes = await tx.quiz.deleteMany({
    where: { slug: { notIn: Array.from(activeSlugs.quizSlugs) } },
  });
  stats.quizzes.deleted = delQuizzes.count;

  const delModules = await tx.module.deleteMany({
    where: { slug: { notIn: Array.from(activeSlugs.moduleSlugs) } },
  });
  stats.modules.deleted = delModules.count;

  const delTracks = await tx.track.deleteMany({
    where: { slug: { notIn: Array.from(activeSlugs.trackSlugs) } },
  });
  stats.tracks.deleted = delTracks.count;
}
