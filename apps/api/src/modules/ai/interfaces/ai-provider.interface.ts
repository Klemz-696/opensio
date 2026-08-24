/**
 * Interface d'abstraction pour les fournisseurs d'IA (AiProvider)
 * Conforme à la spécification contractuelle OpenSIO (§28.2).
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  context?: {
    labSlug?: string;
    lessonSlug?: string;
  };
}

export interface ChatResult {
  content: string;
  tokensUsed: number;
  provider: string;
  model: string;
}

export const AI_PROVIDER_TOKEN = Symbol('AI_PROVIDER_TOKEN');

export interface AiProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  isAvailable(): Promise<boolean>;
}
