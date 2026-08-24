import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LessonProgressStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { LessonProgressDto } from './dto/progress-responses.dto';
import type { PaginatedActivityEventsDto } from './dto/activity-event.dto';

@Injectable()
export class ProgressService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Marque une leçon comme terminée pour l'utilisateur connecté (Idempotent).
   */
  async completeLesson(
    userId: string,
    lessonSlug: string,
    timeSpentSeconds?: number,
  ): Promise<LessonProgressDto> {
    const normalizedSlug = lessonSlug.toLowerCase().trim();

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: normalizedSlug },
      include: {
        module: {
          include: {
            track: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Leçon introuvable : ${lessonSlug}`);
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId: lesson.id,
        },
      },
    });

    const now = new Date();
    const additionalTime = Math.max(0, timeSpentSeconds ?? 0);
    const wasAlreadyCompleted = existing?.status === LessonProgressStatus.COMPLETED;

    let progress;
    if (existing) {
      progress = await this.prisma.lessonProgress.update({
        where: {
          userId_lessonId: {
            userId,
            lessonId: lesson.id,
          },
        },
        data: {
          status: LessonProgressStatus.COMPLETED,
          completedAt: existing.completedAt ?? now,
          timeSpentSeconds: existing.timeSpentSeconds + additionalTime,
          updatedAt: now,
        },
      });
    } else {
      progress = await this.prisma.lessonProgress.create({
        data: {
          userId,
          lessonId: lesson.id,
          status: LessonProgressStatus.COMPLETED,
          completedAt: now,
          timeSpentSeconds: additionalTime,
        },
      });
    }

    // Journalisation de l'événement d'activité UNIQUEMENT lors de la première complétion (transition réelle)
    if (!wasAlreadyCompleted) {
      await this.prisma.activityEvent.create({
        data: {
          userId,
          kind: 'LESSON_COMPLETED',
          entityType: 'lesson',
          entityId: lesson.id,
          metadata: {
            lessonSlug: lesson.slug,
            lessonTitle: lesson.title,
            moduleSlug: lesson.module.slug,
            moduleTitle: lesson.module.title,
            trackSlug: lesson.module.track.slug,
          },
        },
      });
    }

    return {
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      title: lesson.title,
      status: 'completed',
      timeSpentSeconds: progress.timeSpentSeconds,
      completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  /**
   * Cumule le temps passé sur une leçon via heartbeat régulier (Idempotent).
   */
  async heartbeatLesson(
    userId: string,
    lessonSlug: string,
    seconds: number,
  ): Promise<LessonProgressDto> {
    const normalizedSlug = lessonSlug.toLowerCase().trim();

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: normalizedSlug },
      include: {
        module: {
          include: {
            track: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Leçon introuvable : ${lessonSlug}`);
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId: lesson.id,
        },
      },
    });

    const now = new Date();
    const validSeconds = Math.max(0, seconds);

    let progress;
    if (existing) {
      progress = await this.prisma.lessonProgress.update({
        where: {
          userId_lessonId: {
            userId,
            lessonId: lesson.id,
          },
        },
        data: {
          timeSpentSeconds: existing.timeSpentSeconds + validSeconds,
          updatedAt: now,
        },
      });
    } else {
      progress = await this.prisma.lessonProgress.create({
        data: {
          userId,
          lessonId: lesson.id,
          status: LessonProgressStatus.STARTED,
          timeSpentSeconds: validSeconds,
        },
      });

      // Événement d'activité pour le premier démarrage
      await this.prisma.activityEvent.create({
        data: {
          userId,
          kind: 'LESSON_STARTED',
          entityType: 'lesson',
          entityId: lesson.id,
          metadata: {
            lessonSlug: lesson.slug,
            lessonTitle: lesson.title,
            moduleSlug: lesson.module.slug,
            moduleTitle: lesson.module.title,
            trackSlug: lesson.module.track.slug,
          },
        },
      });
    }

    return {
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      title: lesson.title,
      status: progress.status === LessonProgressStatus.COMPLETED ? 'completed' : 'started',
      timeSpentSeconds: progress.timeSpentSeconds,
      completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  /**
   * Récupère l'état de progression d'une leçon individuelle.
   */
  async getLessonProgress(
    userId: string,
    lessonSlug: string,
  ): Promise<LessonProgressDto> {
    const normalizedSlug = lessonSlug.toLowerCase().trim();

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!lesson) {
      throw new NotFoundException(`Leçon introuvable : ${lessonSlug}`);
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId: lesson.id,
        },
      },
    });

    return {
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      title: lesson.title,
      status: progress?.status === LessonProgressStatus.COMPLETED ? 'completed' : 'started',
      timeSpentSeconds: progress?.timeSpentSeconds ?? 0,
      completedAt: progress?.completedAt ? progress.completedAt.toISOString() : null,
      updatedAt: progress?.updatedAt
        ? progress.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  /**
   * Récupère les événements d'activité paginés pour un utilisateur.
   */
  async getActivityEvents(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedActivityEventsDto> {
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const [items, total] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      this.prisma.activityEvent.count({
        where: { userId },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: (item.metadata as Record<string, unknown>) ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(total / validPageSize) || 1,
    };
  }
}
