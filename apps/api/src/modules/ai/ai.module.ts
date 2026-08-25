import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { ChatService } from './services/chat.service';
import { AiContextSanitizerService } from './services/ai-context-sanitizer.service';
import { AiSolutionFilterService } from './services/ai-solution-filter.service';
import { AiRateLimiterService } from './services/ai-rate-limiter.service';
import { OpenAiCompatibleProvider } from './providers/openai-compatible-provider.service';
import { NullProvider } from './providers/null-provider.service';
import { AI_PROVIDER_TOKEN } from './interfaces/ai-provider.interface';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [AiController],
  providers: [
    OpenAiCompatibleProvider,
    NullProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (
        openAiProvider: OpenAiCompatibleProvider,
        nullProvider: NullProvider
      ) => {
        const isEnabled = process.env.AI_ENABLED !== 'false';
        const providerName = process.env.AI_PROVIDER || 'openai-compatible';

        if (!isEnabled || providerName === 'null') {
          return nullProvider;
        }

        return openAiProvider;
      },
      inject: [OpenAiCompatibleProvider, NullProvider],
    },
    AiContextSanitizerService,
    AiSolutionFilterService,
    AiRateLimiterService,
    ChatService,
  ],
  exports: [
    ChatService,
    AiContextSanitizerService,
    AiSolutionFilterService,
    AiRateLimiterService,
    AI_PROVIDER_TOKEN,
  ],
})
export class AiModule {}
