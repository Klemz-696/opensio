import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { QuizzesController } from './quizzes.controller';
import { QuizService } from './services/quiz.service';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { QuizScoringService } from './services/quiz-scoring.service';
import { QuizIdempotencyService } from './services/quiz-idempotency.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [QuizzesController],
  providers: [
    QuizService,
    QuizAttemptsService,
    QuizScoringService,
    QuizIdempotencyService,
  ],
  exports: [QuizService, QuizAttemptsService, QuizScoringService],
})
export class QuizzesModule {}
