import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressAggregationService } from '../progress-aggregation.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ProgressAggregationService', () => {
  let service: ProgressAggregationService;
  let prismaMock: {
    track: { findMany: ReturnType<typeof vi.fn> };
    lessonProgress: { findMany: ReturnType<typeof vi.fn> };
    quizAttempt: { findMany: ReturnType<typeof vi.fn> };
  };

  const mockTracks = [
    {
      id: 'track-1',
      slug: 'annee-1',
      title: 'Première Année',
      position: 1,
      modules: [
        {
          id: 'mod-1',
          slug: 'reseaux-fondamentaux',
          title: 'Réseaux fondamentaux',
          position: 1,
          lessons: [
            { id: 'les-1', slug: 'adressage-ipv4', title: 'Adressage IPv4', position: 1 },
            { id: 'les-2', slug: 'vlsm', title: 'VLSM', position: 2 },
          ],
          quizzes: [
            { id: 'quiz-1', slug: 'quiz-adressage', title: 'Quiz Adressage', passingScore: 80 },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    prismaMock = {
      track: { findMany: vi.fn().mockResolvedValue(mockTracks) },
      lessonProgress: { findMany: vi.fn() },
      quizAttempt: { findMany: vi.fn() },
    };

    service = new ProgressAggregationService(prismaMock as unknown as PrismaService);
  });

  it('calcule 0% de progression pour un utilisateur sans activité', async () => {
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.quizAttempt.findMany.mockResolvedValue([]);

    const tree = await service.getUserProgressTree('user-new');

    expect(tree.global.totalLessons).toBe(2);
    expect(tree.global.completedLessons).toBe(0);
    expect(tree.global.progressPercentage).toBe(0);
    expect(tree.global.completedModules).toBe(0);
    expect(tree.global.totalTimeSpentSeconds).toBe(0);

    const mod = tree.tracks[0].modules[0];
    expect(mod.progressPercentage).toBe(0);
    expect(mod.completedLessons).toBe(0);
    expect(mod.isCompleted).toBe(false);
  });

  it('calcule 50% de progression quand 1 leçon sur 2 est terminée', async () => {
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      {
        lessonId: 'les-1',
        status: 'COMPLETED',
        timeSpentSeconds: 300,
        completedAt: new Date('2026-08-24T12:00:00Z'),
        updatedAt: new Date('2026-08-24T12:00:00Z'),
      },
    ]);
    prismaMock.quizAttempt.findMany.mockResolvedValue([]);

    const tree = await service.getUserProgressTree('user-half');

    expect(tree.global.completedLessons).toBe(1);
    expect(tree.global.progressPercentage).toBe(50);
    expect(tree.global.totalTimeSpentSeconds).toBe(300);
    expect(tree.global.completedModules).toBe(0); // non validé car quiz pas encore passé
  });

  it('valide le module selon RM-03 (toutes leçons terminées + quiz réussi)', async () => {
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      {
        lessonId: 'les-1',
        status: 'COMPLETED',
        timeSpentSeconds: 200,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        lessonId: 'les-2',
        status: 'COMPLETED',
        timeSpentSeconds: 300,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prismaMock.quizAttempt.findMany.mockResolvedValue([
      {
        quizId: 'quiz-1',
        passed: true,
        score: 100,
        startedAt: new Date(),
      },
    ]);

    const tree = await service.getUserProgressTree('user-completed');

    expect(tree.global.completedLessons).toBe(2);
    expect(tree.global.progressPercentage).toBe(100);
    expect(tree.global.completedModules).toBe(1);
    expect(tree.global.quizzesPassed).toBe(1);

    const mod = tree.tracks[0].modules[0];
    expect(mod.isCompleted).toBe(true);
    expect(mod.quizPassed).toBe(true);
    expect(mod.quizBestScore).toBe(100);
  });
});
