import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressAggregationService } from '../progress/progress-aggregation.service';
import { RecommendationsService } from './recommendations.service';
import type {
  DashboardRecentQuizDto,
  DashboardResponseDto,
  DashboardResumeItemDto,
} from './dto/dashboard-response.dto';
import type { ActivityEventDto } from '../progress/dto/activity-event.dto';
import type { TrackProgressDto } from '../progress/dto/progress-responses.dto';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProgressAggregationService)
    private readonly aggregationService: ProgressAggregationService,
    @Inject(RecommendationsService)
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Récupère toutes les données agrégées du tableau de bord pour l'étudiant connecté.
   */
  async getDashboard(userId: string): Promise<DashboardResponseDto> {
    // 1. Arborescence de progression et agrégats
    const progressTree = await this.aggregationService.getUserProgressTree(userId);

    // 2. Dernières tentatives de quiz
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        quiz: {
          include: {
            module: true,
          },
        },
      },
    });

    const recentQuizzes: DashboardRecentQuizDto[] = quizAttempts.map((attempt) => ({
      attemptId: attempt.id,
      quizId: attempt.quizId,
      quizSlug: attempt.quiz.slug,
      quizTitle: attempt.quiz.title,
      moduleSlug: attempt.quiz.module.slug,
      score: attempt.score,
      passed: attempt.passed,
      passingScore: attempt.quiz.passingScore,
      completedAt: attempt.completedAt
        ? attempt.completedAt.toISOString()
        : attempt.startedAt.toISOString(),
    }));

    // 3. Éléments à reprendre ("Où j'en étais")
    const recentLessonsProgress = await this.prisma.lessonProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      include: {
        lesson: {
          include: {
            module: {
              include: {
                track: true,
              },
            },
          },
        },
      },
    });

    const resume: DashboardResumeItemDto[] = recentLessonsProgress.map((lp) => ({
      lessonId: lp.lessonId,
      lessonSlug: lp.lesson.slug,
      lessonTitle: lp.lesson.title,
      moduleSlug: lp.lesson.module.slug,
      moduleTitle: lp.lesson.module.title,
      trackSlug: lp.lesson.module.track.slug,
      difficulty: lp.lesson.difficulty,
      estimatedMinutes: lp.lesson.estimatedMinutes,
      status: lp.status === 'COMPLETED' ? 'completed' : 'started',
      timeSpentSeconds: lp.timeSpentSeconds,
      updatedAt: lp.updatedAt.toISOString(),
    }));

    // 4. Derniers événements d'activité
    const activityEvents = await this.prisma.activityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentActivity: ActivityEventDto[] = activityEvents.map((evt) => ({
      id: evt.id,
      kind: evt.kind,
      entityType: evt.entityType,
      entityId: evt.entityId,
      metadata: (evt.metadata as Record<string, unknown>) ?? null,
      createdAt: evt.createdAt.toISOString(),
    }));

    // 5. Recommandations personnalisées
    const recommendations = this.recommendationsService.generateRecommendations(
      progressTree,
      recentQuizzes,
    );

    // 6. Résumé par track
    const tracksProgress: TrackProgressDto[] = progressTree.tracks.map((t) => ({
      trackId: t.trackId,
      trackSlug: t.trackSlug,
      title: t.title,
      totalLessons: t.totalLessons,
      completedLessons: t.completedLessons,
      progressPercentage: t.progressPercentage,
      modulesCount: t.modulesCount,
      completedModulesCount: t.completedModulesCount,
    }));

    return {
      overview: progressTree.global,
      tracksProgress,
      resume,
      recentQuizzes,
      recentActivity,
      recommendations,
    };
  }
}
