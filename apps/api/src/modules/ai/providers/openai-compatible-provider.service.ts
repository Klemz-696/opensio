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
  private readonly defaultModel: string;
  private readonly apiKey?: string;
  private readonly defaultTimeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
    this.defaultModel = process.env.AI_MODEL || 'llama3.1:8b';
    this.apiKey = process.env.AI_API_KEY;
    const parsedTimeout = Number(process.env.AI_TIMEOUT_MS);
    this.defaultTimeoutMs = !isNaN(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 120000;
  }

  /**
   * Vérifie la disponibilité du fournisseur IA.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

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

  /**
   * Récupère la liste des modèles installés / disponibles (via /api/tags d'Ollama ou /models de l'API).
   */
  async listModels(): Promise<string[]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // 1. Tenter le endpoint natif Ollama (/api/tags) si applicable
    try {
      const rootUrl = this.baseUrl.replace(/\/v1$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resOllama = await fetch(`${rootUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resOllama.ok) {
        const data = (await resOllama.json()) as { models?: Array<{ name: string }> };
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          return data.models.map((m) => m.name);
        }
      }
    } catch (err) {
      this.logger.debug(`Impossible de contacter /api/tags : ${String(err)}`);
    }

    // 2. Tenter le endpoint standard OpenAI (/v1/models ou /models)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          return data.data.map((m) => m.id);
        }
      }
    } catch (err) {
      this.logger.warn(`Échec de récupération des modèles via /models : ${String(err)}`);
    }

    // Repli sur le modèle par défaut configuré
    return [this.defaultModel];
  }

  /**
   * Envoie une requête de chat au fournisseur IA avec gestion du timeout configurable et chargement en RAM.
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const activeModel = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: activeModel,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          `Le service d'assistance IA a renvoyé une erreur (${response.status}). En attendant, consulte les fiches de cours du module !`,
          activeModel
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
        model: activeModel,
      };
    } catch (err: unknown) {
      // Diagnostic de la cause réelle de l'échec
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.message?.toLowerCase().includes('aborted') ||
          err.message?.toLowerCase().includes('timeout'));

      this.logger.warn(
        `[OpenAiCompatibleProvider] Échec d'appel IA à ${this.baseUrl} (Timeout: ${timeoutMs}ms) : ${
          err instanceof Error ? err.stack || err.message : String(err)
        }`
      );

      if (isAbort) {
        return {
          content: [
            '[Mentor OpenSIO — Modèle en chargement]',
            "Le modèle d'intelligence artificielle est en cours de chargement en mémoire vive. Veuillez patienter quelques instants et réessayer votre question.",
          ].join('\n'),
          tokensUsed: 0,
          provider: this.name,
          model: activeModel,
        };
      }

      return this.getFallbackResponse(
        'Le serveur Ollama / IA est actuellement injoignable. Pense à vérifier tes cours ou à tester tes hypothèses dans le terminal du lab.',
        activeModel
      );
    }
  }

  private getFallbackResponse(message: string, model: string): ChatResult {
    return {
      content: `[Mentor OpenSIO — Mode Dégradé]\n${message}`,
      tokensUsed: 0,
      provider: this.name,
      model,
    };
  }
}
