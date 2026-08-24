import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QuizScoringService, type QuestionToGrade } from './quiz-scoring.service';
import { QuizIdempotencyService } from './quiz-idempotency.service';
import type { QuizAttemptResultDto } from '../dto/quiz-responses.dto';

@Injectable()
export class QuizAttemptsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(QuizScoringService) private readonly scoringService: QuizScoringService,
    @Inject(QuizIdempotencyService) private readonly idempotencyService: QuizIdempotencyService,
  ) {}

  /**
   * Soumet et corrige une tentative de quiz avec garantie d'idempotence et journalisation d'audit.
   */
  async submitAttempt(
    userId: string,
    quizSlug: string,
    answers: Record<string, string[]>,
    idempotencyKey?: string | null,
    ip?: string | null,
  ): Promise<QuizAttemptResultDto> {
    const normalizedSlug = quizSlug.toLowerCase().trim();

    const quiz = await this.prisma.quiz.findUnique({
      where: { slug: normalizedSlug },
      include: {
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz introuvable : ${quizSlug}`);
    }

    const payloadHash = this.idempotencyService.computePayloadHash(answers);
    const dedupKey = this.idempotencyService.generateKey(userId, quiz.id, payloadHash, idempotencyKey);

    return this.idempotencyService.executeWithIdempotency(dedupKey, payloadHash, async () => {
      const questionsToGrade: QuestionToGrade[] = quiz.questions.map((q) => ({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        correctChoiceIds: Array.isArray(q.correctChoiceIds)
          ? (q.correctChoiceIds as unknown as string[])
          : [],
        explanation: q.explanation,
      }));

      const grading = this.scoringService.gradeQuiz(
        questionsToGrade,
        answers,
        quiz.passingScore,
      );

      const now = new Date();

      const attempt = await this.prisma.quizAttempt.create({
        data: {
          userId,
          quizId: quiz.id,
          answers: answers as Prisma.InputJsonValue,
          score: grading.score,
          passed: grading.passed,
          startedAt: now,
          completedAt: now,
        },
      });

      await this.auditService.logEvent({
        action: 'QUIZ_ATTEMPT_SUBMITTED',
        actorId: userId,
        targetType: 'quiz',
        targetId: quiz.id,
        metadata: {
          quizSlug: quiz.slug,
          score: grading.score,
          passed: grading.passed,
          passingScore: quiz.passingScore,
          attemptId: attempt.id,
        },
        ip: ip ?? null,
      });

      return {
        id: attempt.id,
        quizId: quiz.id,
        quizSlug: quiz.slug,
        score: grading.score,
        passed: grading.passed,
        passingScore: quiz.passingScore,
        totalQuestions: grading.totalQuestions,
        correctQuestions: grading.correctQuestions,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt
          ? attempt.completedAt.toISOString()
          : attempt.startedAt.toISOString(),
        questions: grading.questionCorrections,
      };
    });
  }
}
