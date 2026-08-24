import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuizService } from './services/quiz.service';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { SubmitQuizAttemptSchema } from './dto/submit-attempt.dto';
import type {
  QuizDetailDto,
  QuizAttemptResultDto,
  QuizAttemptHistoryItemDto,
} from './dto/quiz-responses.dto';

@Controller('quizzes')
@UseGuards(AuthGuard)
export class QuizzesController {
  constructor(
    @Inject(QuizService) private readonly quizService: QuizService,
    @Inject(QuizAttemptsService) private readonly attemptsService: QuizAttemptsService,
  ) {}

  /**
   * Récupère les questions d'un quiz pour passation (sans réponses correctes ni explications).
   */
  @Get(':slug')
  async getQuiz(@Param('slug') slug: string): Promise<QuizDetailDto> {
    return this.quizService.getQuizBySlug(slug);
  }

  /**
   * Soumet les réponses d'un utilisateur à un quiz, enregistre et corrige la tentative.
   */
  @Post(':slug/attempts')
  async submitAttempt(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Req() req?: Request,
  ): Promise<QuizAttemptResultDto> {
    const parseResult = SubmitQuizAttemptSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Format des réponses invalide',
        errors: parseResult.error.flatten(),
      });
    }

    const ip = req?.ip || (req?.headers['x-forwarded-for'] as string) || null;

    return this.attemptsService.submitAttempt(
      user.id,
      slug,
      parseResult.data.answers,
      idempotencyKey,
      ip,
    );
  }

  /**
   * Récupère l'historique des tentatives de l'utilisateur connecté sur ce quiz.
   */
  @Get(':slug/attempts')
  async getAttemptsHistory(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuizAttemptHistoryItemDto[]> {
    return this.quizService.getAttemptsHistory(user.id, slug);
  }
}
