import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GlobalProgressDto,
  LessonProgressDto,
  ModuleProgressDto,
  ModuleProgressTreeDto,
  TrackProgressTreeDto,
  UserProgressTreeDto,
} from './dto/progress-responses.dto';

interface QuizAggregates {
  passed: boolean;
  bestScore: number;
  attemptsCount: number;
}

@Injectable()
export class ProgressAggregationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Calcule l'arborescence complète de progression pour un utilisateur.
   * Exécute des requêtes groupées sans boucle N+1.
   */
  async getUserProgressTree(userId: string): Promise<UserProgressTreeDto> {
    // 1. Récupération de toute la structure du catalogue
    const tracks = await this.prisma.track.findMany({
      orderBy: { position: 'asc' },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                slug: true,
                title: true,
                position: true,
              },
            },
            quizzes: {
              select: {
                id: true,
                slug: true,
                title: true,
                passingScore: true,
              },
            },
          },
        },
      },
    });

    // 2. Récupération en une seule requête de toutes les progressions de l'utilisateur
    const [lessonProgresses, quizAttempts] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    // Indexation O(1) en mémoire
    const progressMap = new Map(
      lessonProgresses.map((lp) => [lp.lessonId, lp]),
    );

    const quizMap = new Map<string, QuizAggregates>();
    for (const attempt of quizAttempts) {
      const existing = quizMap.get(attempt.quizId);
      if (!existing) {
        quizMap.set(attempt.quizId, {
          passed: attempt.passed,
          bestScore: attempt.score,
          attemptsCount: 1,
        });
      } else {
        existing.attemptsCount += 1;
        if (attempt.passed) existing.passed = true;
        if (attempt.score > existing.bestScore) existing.bestScore = attempt.score;
      }
    }

    let globalTotalLessons = 0;
    let globalCompletedLessons = 0;
    let globalTimeSpent = 0;
    let globalTotalModules = 0;
    let globalCompletedModules = 0;
    let globalTotalQuizzes = 0;
    let globalQuizzesPassed = 0;

    const tracksTree: TrackProgressTreeDto[] = [];

    for (const track of tracks) {
      let trackTotalLessons = 0;
      let trackCompletedLessons = 0;
      let trackCompletedModulesCount = 0;
      const modulesTree: ModuleProgressTreeDto[] = [];

      for (const mod of track.modules) {
        globalTotalModules += 1;
        const modTotalLessons = mod.lessons.length;
        trackTotalLessons += modTotalLessons;
        globalTotalLessons += modTotalLessons;

        let modCompletedLessons = 0;
        const lessonsProgressList: LessonProgressDto[] = [];

        for (const lesson of mod.lessons) {
          const lp = progressMap.get(lesson.id);
          const isCompleted = lp?.status === 'COMPLETED';
          const timeSpent = lp?.timeSpentSeconds ?? 0;
          globalTimeSpent += timeSpent;

          if (isCompleted) {
            modCompletedLessons += 1;
            trackCompletedLessons += 1;
            globalCompletedLessons += 1;
          }

          lessonsProgressList.push({
            lessonId: lesson.id,
            lessonSlug: lesson.slug,
            title: lesson.title,
            status: isCompleted ? 'completed' : 'started',
            timeSpentSeconds: timeSpent,
            completedAt: lp?.completedAt ? lp.completedAt.toISOString() : null,
            updatedAt: lp?.updatedAt
              ? lp.updatedAt.toISOString()
              : new Date().toISOString(),
          });
        }

        // Quiz du module
        let modQuizPassed = false;
        let modQuizBestScore: number | null = null;
        if (mod.quizzes.length > 0) {
          globalTotalQuizzes += mod.quizzes.length;
          for (const q of mod.quizzes) {
            const qData = quizMap.get(q.id);
            if (qData) {
              if (qData.passed) {
                modQuizPassed = true;
                globalQuizzesPassed += 1;
              }
              if (modQuizBestScore === null || qData.bestScore > modQuizBestScore) {
                modQuizBestScore = qData.bestScore;
              }
            }
          }
        }

        // Règle RM-03 : Un module est validé si toutes ses leçons sont terminées ET quiz réussi (si quiz existant)
        const allLessonsCompleted =
          modTotalLessons > 0 && modCompletedLessons === modTotalLessons;
        const quizConditionMet = mod.quizzes.length === 0 || modQuizPassed;
        const isModuleCompleted = allLessonsCompleted && quizConditionMet;

        if (isModuleCompleted) {
          trackCompletedModulesCount += 1;
          globalCompletedModules += 1;
        }

        const modProgressPct =
          modTotalLessons > 0
            ? Math.round((modCompletedLessons / modTotalLessons) * 100)
            : 0;

        modulesTree.push({
          moduleId: mod.id,
          moduleSlug: mod.slug,
          title: mod.title,
          trackSlug: track.slug,
          totalLessons: modTotalLessons,
          completedLessons: modCompletedLessons,
          progressPercentage: modProgressPct,
          isCompleted: isModuleCompleted,
          quizPassed: modQuizPassed,
          quizBestScore: modQuizBestScore,
          lessons: lessonsProgressList,
        });
      }

      const trackProgressPct =
        trackTotalLessons > 0
          ? Math.round((trackCompletedLessons / trackTotalLessons) * 100)
          : 0;

      tracksTree.push({
        trackId: track.id,
        trackSlug: track.slug,
        title: track.title,
        totalLessons: trackTotalLessons,
        completedLessons: trackCompletedLessons,
        progressPercentage: trackProgressPct,
        modulesCount: track.modules.length,
        completedModulesCount: trackCompletedModulesCount,
        modules: modulesTree,
      });
    }

    const globalProgressPct =
      globalTotalLessons > 0
        ? Math.round((globalCompletedLessons / globalTotalLessons) * 100)
        : 0;

    const global: GlobalProgressDto = {
      totalLessons: globalTotalLessons,
      completedLessons: globalCompletedLessons,
      progressPercentage: globalProgressPct,
      totalTimeSpentSeconds: globalTimeSpent,
      totalModules: globalTotalModules,
      completedModules: globalCompletedModules,
      quizzesPassed: globalQuizzesPassed,
      totalQuizzes: globalTotalQuizzes,
    };

    return {
      global,
      tracks: tracksTree,
    };
  }

  /**
   * Calcule les résumés de progression par track pour injection dans le catalogue.
   */
  async getTracksProgressSummaries(
    userId: string,
  ): Promise<Map<string, { totalLessons: number; completedLessons: number; progressPercentage: number }>> {
    const tree = await this.getUserProgressTree(userId);
    const map = new Map<string, { totalLessons: number; completedLessons: number; progressPercentage: number }>();
    for (const track of tree.tracks) {
      map.set(track.trackSlug, {
        totalLessons: track.totalLessons,
        completedLessons: track.completedLessons,
        progressPercentage: track.progressPercentage,
      });
    }
    return map;
  }

  /**
   * Calcule les résumés de progression par module pour un track.
   */
  async getModulesProgressSummaries(
    userId: string,
    trackSlug: string,
  ): Promise<Map<string, ModuleProgressDto>> {
    const tree = await this.getUserProgressTree(userId);
    const track = tree.tracks.find((t) => t.trackSlug === trackSlug);
    const map = new Map<string, ModuleProgressDto>();
    if (track) {
      for (const mod of track.modules) {
        map.set(mod.moduleSlug, mod);
      }
    }
    return map;
  }
}
