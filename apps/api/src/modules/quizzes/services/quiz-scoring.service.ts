import { Injectable } from '@nestjs/common';
import type { QuizQuestionCorrectionDto } from '../dto/quiz-responses.dto';

export interface QuestionToGrade {
  id: string;
  kind: string; // 'SINGLE' | 'MULTIPLE' | 'single' | 'multiple'
  prompt: string;
  correctChoiceIds: string[];
  explanation: string | null;
}

export interface QuizGradingResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctQuestions: number;
  questionCorrections: QuizQuestionCorrectionDto[];
}

@Injectable()
export class QuizScoringService {
  /**
   * Évalue la réponse d'un utilisateur pour une question donnée.
   * La comparaison est stricte (ensembles identiques).
   */
  gradeQuestion(
    question: QuestionToGrade,
    userAnswers: string[] | undefined,
  ): { isCorrect: boolean; normalizedUserAnswers: string[] } {
    const rawAnswers = userAnswers ?? [];
    const normalizedUserAnswers = Array.from(
      new Set(rawAnswers.filter((a) => typeof a === 'string' && a.trim().length > 0)),
    );

    const correctSet = new Set(question.correctChoiceIds);
    const userSet = new Set(normalizedUserAnswers);

    const isSingle = question.kind.toUpperCase() === 'SINGLE';

    if (isSingle) {
      if (normalizedUserAnswers.length !== 1 || question.correctChoiceIds.length !== 1) {
        return { isCorrect: false, normalizedUserAnswers };
      }
      const isCorrect = normalizedUserAnswers[0] === question.correctChoiceIds[0];
      return { isCorrect, normalizedUserAnswers };
    }

    // Question à choix multiples : comparaison stricte des ensembles
    if (userSet.size !== correctSet.size) {
      return { isCorrect: false, normalizedUserAnswers };
    }

    for (const choiceId of userSet) {
      if (!correctSet.has(choiceId)) {
        return { isCorrect: false, normalizedUserAnswers };
      }
    }

    return { isCorrect: true, normalizedUserAnswers };
  }

  /**
   * Corrige l'ensemble du quiz, calcule le score en pourcentage et évalue la réussite.
   * RM-01 : score >= passingScore -> passed = true.
   */
  gradeQuiz(
    questions: QuestionToGrade[],
    answers: Record<string, string[]>,
    passingScore: number,
  ): QuizGradingResult {
    const totalQuestions = questions.length;
    let correctQuestions = 0;

    const questionCorrections: QuizQuestionCorrectionDto[] = questions.map((q) => {
      const userAnswers = answers[q.id];
      const { isCorrect, normalizedUserAnswers } = this.gradeQuestion(q, userAnswers);

      if (isCorrect) {
        correctQuestions += 1;
      }

      return {
        questionId: q.id,
        prompt: q.prompt,
        kind: q.kind.toLowerCase() as 'single' | 'multiple',
        userAnswers: normalizedUserAnswers,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 100;
    const passed = score >= passingScore;

    return {
      score,
      passed,
      totalQuestions,
      correctQuestions,
      questionCorrections,
    };
  }
}
