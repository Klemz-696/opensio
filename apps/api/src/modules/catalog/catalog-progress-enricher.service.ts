import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressAggregationService } from '../progress/progress-aggregation.service';
import type {
  LessonDetailDto,
  ModuleDetailDto,
  ModuleSummaryDto,
  TrackSummaryDto,
} from './dto/catalog-responses.dto';

@Injectable()
export class CatalogProgressEnricherService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProgressAggregationService)
    private readonly progressAggregation: ProgressAggregationService,
  ) {}

  /**
   * Enrichit la liste des tracks avec les résumés de progression de l'utilisateur.
   */
  async enrichTracks(
    tracks: TrackSummaryDto[],
    userId: string,
  ): Promise<TrackSummaryDto[]> {
    const progressMap = await this.progressAggregation.getTracksProgressSummaries(userId);
    return tracks.map((track) => ({
      ...track,
      progress: progressMap.get(track.slug) ?? {
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
      },
    }));
  }

  /**
   * Enrichit les modules d'un track avec la progression de l'utilisateur.
   */
  async enrichModules(
    modules: ModuleSummaryDto[],
    trackSlug: string,
    userId: string,
  ): Promise<ModuleSummaryDto[]> {
    const modulesProgress = await this.progressAggregation.getModulesProgressSummaries(
      userId,
      trackSlug,
    );

    return modules.map((mod) => {
      const p = modulesProgress.get(mod.slug);
      return {
        ...mod,
        progress: p
          ? {
              totalLessons: p.totalLessons,
              completedLessons: p.completedLessons,
              progressPercentage: p.progressPercentage,
              isCompleted: p.isCompleted,
            }
          : null,
      };
    });
  }

  /**
   * Enrichit le détail d'un module avec l'état de chaque leçon et quiz.
   */
  async enrichModuleDetail(
    detail: ModuleDetailDto,
    userId: string,
  ): Promise<ModuleDetailDto> {
    const lessonIds = detail.lessons.map((l) => l.id);
    const quizIds = detail.quizzes.map((q) => q.id);

    const [userLessons, userQuizzes] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessonIds } },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds } },
        orderBy: { score: 'desc' },
      }),
    ]);

    const lessonMap = new Map(
      userLessons.map((lp) => [
        lp.lessonId,
        lp.status === 'COMPLETED' ? ('completed' as const) : ('started' as const),
      ]),
    );

    const quizMap = new Map<string, { passed: boolean; bestScore: number }>();
    for (const qa of userQuizzes) {
      const existing = quizMap.get(qa.quizId);
      if (!existing) {
        quizMap.set(qa.quizId, { passed: qa.passed, bestScore: qa.score });
      } else {
        if (qa.passed) existing.passed = true;
        if (qa.score > existing.bestScore) existing.bestScore = qa.score;
      }
    }

    const completedCount = userLessons.filter((lp) => lp.status === 'COMPLETED').length;
    const totalCount = detail.lessons.length;
    const isCompleted =
      totalCount > 0 &&
      completedCount === totalCount &&
      (detail.quizzes.length === 0 || Array.from(quizMap.values()).some((q) => q.passed));

    return {
      ...detail,
      progress: {
        totalLessons: totalCount,
        completedLessons: completedCount,
        progressPercentage:
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        isCompleted,
      },
      lessons: detail.lessons.map((lesson) => ({
        ...lesson,
        status: lessonMap.get(lesson.id) ?? null,
      })),
      quizzes: detail.quizzes.map((quiz) => {
        const qData = quizMap.get(quiz.id);
        return {
          ...quiz,
          passed: qData?.passed ?? false,
          bestScore: qData?.bestScore ?? null,
        };
      }),
    };
  }

  /**
   * Enrichit le détail d'une leçon avec le statut de progression de l'utilisateur.
   */
  async enrichLessonDetail(
    detail: LessonDetailDto,
    userId: string,
  ): Promise<LessonDetailDto> {
    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId: detail.id,
        },
      },
    });

    return {
      ...detail,
      progress: progress
        ? {
            status: progress.status === 'COMPLETED' ? 'completed' : 'started',
            timeSpentSeconds: progress.timeSpentSeconds,
            completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
          }
        : null,
    };
  }
}
