import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LessonProgressStatus } from '@prisma/client';
import { ProgressService } from '../progress.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let prismaMock: {
    lesson: { findUnique: ReturnType<typeof vi.fn> };
    lessonProgress: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    activityEvent: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  const mockLesson = {
    id: 'les-1',
    slug: 'adressage-ipv4',
    title: 'Adressage IPv4',
    module: {
      id: 'mod-1',
      slug: 'reseaux-fondamentaux',
      title: 'Réseaux fondamentaux',
      track: { slug: 'annee-1' },
    },
  };

  beforeEach(() => {
    prismaMock = {
      lesson: { findUnique: vi.fn() },
      lessonProgress: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      activityEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new ProgressService(prismaMock as unknown as PrismaService);
  });

  describe('completeLesson', () => {
    it('crée une nouvelle progression COMPLETED et consigne un ActivityEvent', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(mockLesson);
      prismaMock.lessonProgress.findUnique.mockResolvedValue(null);

      const now = new Date();
      prismaMock.lessonProgress.create.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.COMPLETED,
        timeSpentSeconds: 120,
        completedAt: now,
        updatedAt: now,
      });

      const result = await service.completeLesson('user-1', 'adressage-ipv4', 120);

      expect(result.status).toBe('completed');
      expect(result.timeSpentSeconds).toBe(120);
      expect(prismaMock.lessonProgress.create).toHaveBeenCalled();
      expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            kind: 'LESSON_COMPLETED',
            entityType: 'lesson',
            entityId: 'les-1',
          }),
        }),
      );
    });

    it('met à jour une progression existante de façon idempotente', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(mockLesson);
      prismaMock.lessonProgress.findUnique.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.STARTED,
        timeSpentSeconds: 60,
        completedAt: null,
      });

      const now = new Date();
      prismaMock.lessonProgress.update.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.COMPLETED,
        timeSpentSeconds: 120,
        completedAt: now,
        updatedAt: now,
      });

      const result = await service.completeLesson('user-1', 'adressage-ipv4', 60);

      expect(result.status).toBe('completed');
      expect(result.timeSpentSeconds).toBe(120);
      expect(prismaMock.lessonProgress.update).toHaveBeenCalled();
      expect(prismaMock.activityEvent.create).toHaveBeenCalledTimes(1);
    });

    it('ne consigne PAS de nouvel ActivityEvent si la leçon était déjà COMPLETED', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(mockLesson);
      prismaMock.lessonProgress.findUnique.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.COMPLETED,
        timeSpentSeconds: 120,
        completedAt: new Date('2026-08-24T10:00:00Z'),
      });

      const now = new Date();
      prismaMock.lessonProgress.update.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.COMPLETED,
        timeSpentSeconds: 120,
        completedAt: new Date('2026-08-24T10:00:00Z'),
        updatedAt: now,
      });

      await service.completeLesson('user-1', 'adressage-ipv4');

      expect(prismaMock.lessonProgress.update).toHaveBeenCalled();
      expect(prismaMock.activityEvent.create).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si la leçon est introuvable', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(null);

      await expect(service.completeLesson('user-1', 'inconnue')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('heartbeatLesson', () => {
    it('initialise la progression à STARTED et crée un ActivityEvent au 1er battement', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(mockLesson);
      prismaMock.lessonProgress.findUnique.mockResolvedValue(null);

      const now = new Date();
      prismaMock.lessonProgress.create.mockResolvedValue({
        userId: 'user-1',
        lessonId: 'les-1',
        status: LessonProgressStatus.STARTED,
        timeSpentSeconds: 30,
        completedAt: null,
        updatedAt: now,
      });

      const result = await service.heartbeatLesson('user-1', 'adressage-ipv4', 30);

      expect(result.status).toBe('started');
      expect(result.timeSpentSeconds).toBe(30);
      expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'LESSON_STARTED',
          }),
        }),
      );
    });
  });
});
