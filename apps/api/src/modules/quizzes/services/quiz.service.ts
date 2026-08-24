import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  QuizChoiceDto,
  QuizDetailDto,
  QuizAttemptHistoryItemDto,
} from '../dto/quiz-responses.dto';

@Injectable()
export class QuizService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Récupère les données d'un quiz pour passation par un étudiant.
   * RÈGLE DE SÉCURITÉ ABSOLUE : correctChoiceIds et explanation ne sont JAMAIS renvoyés ici.
   */
  async getQuizBySlug(slug: string): Promise<QuizDetailDto> {
    const normalizedSlug = slug.toLowerCase().trim();

    const quiz = await this.prisma.quiz.findUnique({
      where: { slug: normalizedSlug },
      include: {
        module: {
          select: {
            id: true,
            slug: true,
            title: true,
            track: {
              select: {
                slug: true,
              },
            },
          },
        },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            kind: true,
            prompt: true,
            choices: true,
            position: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz introuvable : ${slug}`);
    }

    return {
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      passingScore: quiz.passingScore,
      position: quiz.position,
      module: {
        id: quiz.module.id,
        slug: quiz.module.slug,
        title: quiz.module.title,
        track: {
          slug: quiz.module.track.slug,
        },
      },
      questions: quiz.questions.map((q) => ({
        id: q.id,
        kind: q.kind.toLowerCase() as 'single' | 'multiple',
        prompt: q.prompt,
        choices: (q.choices as unknown as QuizChoiceDto[]) || [],
        position: q.position,
      })),
    };
  }

  /**
   * Récupère l'historique des tentatives d'un utilisateur pour un quiz.
   */
  async getAttemptsHistory(
    userId: string,
    quizSlug: string,
  ): Promise<QuizAttemptHistoryItemDto[]> {
    const normalizedSlug = quizSlug.toLowerCase().trim();

    const quiz = await this.prisma.quiz.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz introuvable : ${quizSlug}`);
    }

    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: quiz.id,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        score: true,
        passed: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      score: a.score,
      passed: a.passed,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    }));
  }
}
