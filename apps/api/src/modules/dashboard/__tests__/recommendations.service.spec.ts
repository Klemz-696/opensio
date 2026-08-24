import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationsService } from '../recommendations.service';
import type { UserProgressTreeDto } from '../../progress/dto/progress-responses.dto';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(() => {
    service = new RecommendationsService();
  });

  it('génère une recommandation start_learning si aucune leçon n\'est terminée', () => {
    const emptyTree: UserProgressTreeDto = {
      global: {
        totalLessons: 5,
        completedLessons: 0,
        progressPercentage: 0,
        totalTimeSpentSeconds: 0,
        totalModules: 1,
        completedModules: 0,
        quizzesPassed: 0,
        totalQuizzes: 1,
      },
      tracks: [
        {
          trackId: 't-1',
          trackSlug: 'annee-1',
          title: 'Année 1',
          totalLessons: 5,
          completedLessons: 0,
          progressPercentage: 0,
          modulesCount: 1,
          completedModulesCount: 0,
          modules: [
            {
              moduleId: 'm-1',
              moduleSlug: 'reseaux-fondamentaux',
              title: 'Réseaux fondamentaux',
              trackSlug: 'annee-1',
              totalLessons: 5,
              completedLessons: 0,
              progressPercentage: 0,
              isCompleted: false,
              quizPassed: false,
              quizBestScore: null,
              lessons: [
                {
                  lessonId: 'l-1',
                  lessonSlug: 'adressage-ipv4',
                  title: 'Adressage IPv4',
                  status: 'started',
                  timeSpentSeconds: 0,
                  completedAt: null,
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ],
    };

    const recs = service.generateRecommendations(emptyTree, []);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].kind).toBe('start_learning');
    expect(recs[0].href).toBe('/catalogue/reseaux-fondamentaux/adressage-ipv4');
  });

  it('génère une recommandation retry_quiz prioritaire si un quiz a été échoué', () => {
    const tree: UserProgressTreeDto = {
      global: {
        totalLessons: 5,
        completedLessons: 2,
        progressPercentage: 40,
        totalTimeSpentSeconds: 1000,
        totalModules: 1,
        completedModules: 0,
        quizzesPassed: 0,
        totalQuizzes: 1,
      },
      tracks: [],
    };

    const recentQuizzes = [
      {
        attemptId: 'att-1',
        quizId: 'q-1',
        quizSlug: 'quiz-adressage',
        quizTitle: 'Quiz Adressage',
        moduleSlug: 'reseaux-fondamentaux',
        score: 60,
        passed: false,
        passingScore: 80,
        completedAt: new Date().toISOString(),
      },
    ];

    const recs = service.generateRecommendations(tree, recentQuizzes);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].kind).toBe('retry_quiz');
    expect(recs[0].title).toContain('Quiz Adressage');
    expect(recs[0].href).toContain('/quiz/quiz-adressage');
  });
});
