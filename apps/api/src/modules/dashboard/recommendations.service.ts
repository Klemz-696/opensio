import { Injectable } from '@nestjs/common';
import type { UserProgressTreeDto } from '../progress/dto/progress-responses.dto';
import type {
  DashboardRecentQuizDto,
  DashboardRecommendationDto,
} from './dto/dashboard-response.dto';

@Injectable()
export class RecommendationsService {
  /**
   * Génère les recommandations pédagogiques selon les règles métier (§11.3 / US-06).
   */
  generateRecommendations(
    progressTree: UserProgressTreeDto,
    recentQuizzes: DashboardRecentQuizDto[],
  ): DashboardRecommendationDto[] {
    const recommendations: DashboardRecommendationDto[] = [];

    // 1. Quiz échoué à retenter (Priorité 1)
    const latestFailedQuiz = recentQuizzes.find((q) => !q.passed);
    if (latestFailedQuiz) {
      recommendations.push({
        id: `retry-quiz-${latestFailedQuiz.quizSlug}`,
        kind: 'retry_quiz',
        title: `Retenter le quiz « ${latestFailedQuiz.quizTitle} »`,
        description: `Votre dernier score est de ${latestFailedQuiz.score}% (seuil : ${latestFailedQuiz.passingScore}%). Révisez les notions clés et retentez votre chance !`,
        href: `/catalogue/${latestFailedQuiz.moduleSlug}/quiz/${latestFailedQuiz.quizSlug}`,
        priority: 1,
      });
    }

    // 2. Module où toutes les leçons sont lues mais le quiz n'a pas encore été réussi (Priorité 2)
    for (const track of progressTree.tracks) {
      for (const mod of track.modules) {
        if (
          mod.totalLessons > 0 &&
          mod.completedLessons === mod.totalLessons &&
          !mod.quizPassed
        ) {
          recommendations.push({
            id: `take-quiz-${mod.moduleSlug}`,
            kind: 'take_quiz',
            title: `Valider le module « ${mod.title} »`,
            description: `Toutes les leçons sont terminées ! Passez le quiz pour valider officiellement ce module.`,
            href: `/catalogue/${mod.moduleSlug}`,
            priority: 2,
          });
        }
      }
    }

    // 3. Module commencé mais non terminé (Priorité 3)
    for (const track of progressTree.tracks) {
      for (const mod of track.modules) {
        if (
          mod.completedLessons > 0 &&
          mod.completedLessons < mod.totalLessons
        ) {
          const nextLesson = mod.lessons.find((l) => l.status !== 'completed');
          recommendations.push({
            id: `continue-module-${mod.moduleSlug}`,
            kind: 'continue_module',
            title: `Continuer le module « ${mod.title} »`,
            description: nextLesson
              ? `Prochaine leçon : ${nextLesson.title || nextLesson.lessonSlug} (${mod.completedLessons}/${mod.totalLessons} leçons terminées).`
              : `Progression : ${mod.completedLessons}/${mod.totalLessons} leçons terminées.`,
            href: nextLesson
              ? `/catalogue/${mod.moduleSlug}/${nextLesson.lessonSlug}`
              : `/catalogue/${mod.moduleSlug}`,
            priority: 3,
          });
        }
      }
    }

    // 4. Si aucune activité entamée : recommander le premier module de l'année 1
    if (progressTree.global.completedLessons === 0) {
      const firstTrack = progressTree.tracks[0];
      const firstModule = firstTrack?.modules[0];
      if (firstModule) {
        const firstLesson = firstModule.lessons[0];
        recommendations.push({
          id: 'start-learning',
          kind: 'start_learning',
          title: `Bienvenue ! Commencez par « ${firstModule.title} »`,
          description: `Découvrez les fondamentaux du BTS SIO SISR avec la première leçon interactive.`,
          href: firstLesson
            ? `/catalogue/${firstModule.moduleSlug}/${firstLesson.lessonSlug}`
            : `/catalogue/${firstModule.moduleSlug}`,
          priority: 4,
        });
      }
    }

    return recommendations.slice(0, 3);
  }
}
