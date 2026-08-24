import { Injectable, Logger } from '@nestjs/common';
import type {
  AiProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor() {
    this.baseUrl = (process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
    this.model = process.env.AI_MODEL || 'llama3.1:8b';
    this.apiKey = process.env.AI_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Échec de l'appel au fournisseur IA (${response.status}): ${errorText}`);
        return this.getFallbackResponse(
          `Le service d'assistance IA a renvoyé une erreur (${response.status}). En attendant, consulte les fiches de cours du module !`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens ?? 0;

      return {
        content,
        tokensUsed,
        provider: this.name,
        model: this.model,
      };
    } catch (err: unknown) {
      this.logger.warn(`Impossible de contacter le fournisseur IA à ${this.baseUrl}: ${String(err)}`);
      return this.getFallbackResponse(
        'Le serveur Ollama / IA est actuellement injoignable. Pense à vérifier tes cours ou à tester tes hypothèses dans le terminal du lab.'
      );
    }
  }

  private getFallbackResponse(message: string): ChatResult {
    return {
      content: `[Mentor OpenSIO — Mode Dégradé]\n${message}`,
      tokensUsed: 0,
      provider: this.name,
      model: this.model,
    };
  }
}
