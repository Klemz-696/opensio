import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { QuizAttemptResultDto } from '../dto/quiz-responses.dto';

interface CachedAttemptEntry {
  result: QuizAttemptResultDto;
  expiresAt: number;
}

@Injectable()
export class QuizIdempotencyService {
  private readonly logger = new Logger(QuizIdempotencyService.name);
  private readonly cache = new Map<string, CachedAttemptEntry>();
  private readonly inFlight = new Map<string, Promise<QuizAttemptResultDto>>();
  private readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Génère une clé d'idempotence stable à partir de l'utilisateur, du quiz et du payload
   * ou utilise la clé explicitement fournie par le client (en-tête Idempotency-Key).
   */
  generateKey(
    userId: string,
    quizId: string,
    answers: Record<string, string[]>,
    clientKey?: string | null,
  ): string {
    if (clientKey && clientKey.trim().length > 0) {
      return `idempotency:${userId}:${quizId}:${clientKey.trim()}`;
    }

    // Clé basée sur le contenu des réponses (déduplication automatique des doubles clics)
    const sortedEntries = Object.entries(answers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()]);
    const payloadHash = createHash('sha256').update(JSON.stringify(sortedEntries)).digest('hex');

    return `auto-dedup:${userId}:${quizId}:${payloadHash}`;
  }

  /**
   * Exécute une opération avec garantie d'idempotence et de déduplication des requêtes concurrentes.
   */
  async executeWithIdempotency(
    key: string,
    operation: () => Promise<QuizAttemptResultDto>,
  ): Promise<QuizAttemptResultDto> {
    this.cleanExpired();

    // 1. Vérifier si un résultat a déjà été mis en cache pour cette clé
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`[Idempotency] Résultat en cache retourné pour la clé ${key}`);
      return cached.result;
    }

    // 2. Vérifier si une requête identique est déjà en cours de traitement (in-flight concurrency)
    const ongoing = this.inFlight.get(key);
    if (ongoing) {
      this.logger.debug(`[Idempotency] Requête concurrente en vol détectée, attente de la promesse pour ${key}`);
      return ongoing;
    }

    // 3. Exécuter l'opération en enregistrant la promesse en vol
    const promise = (async () => {
      try {
        const result = await operation();
        this.cache.set(key, {
          result,
          expiresAt: Date.now() + this.defaultTtlMs,
        });
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Nettoie les entrées expirées du cache en mémoire.
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Purge manuellement le cache (utilisé pour les tests).
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}
