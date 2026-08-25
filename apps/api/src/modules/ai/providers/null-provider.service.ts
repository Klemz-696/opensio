import { Injectable } from '@nestjs/common';
import type {
  AiProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class NullProvider implements AiProvider {
  readonly name = 'null';

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async listModels(): Promise<string[]> {
    return ['none'];
  }

  async chat(_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResult> {
    return {
      content:
        "L'assistant IA « Mentor » est actuellement désactivé sur cette instance OpenSIO (AI_ENABLED=false). N'hésite pas à consulter les leçons et les indices du lab pour progresser !",
      tokensUsed: 0,
      provider: this.name,
      model: 'none',
    };
  }
}
