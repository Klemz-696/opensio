import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { QuizAttemptResultDto } from '../dto/quiz-responses.dto';

interface CachedAttemptEntry {
  payloadHash: string;
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
   * Calcule un hash SHA-256 stable et canonique du corps des réponses.
   */
  computePayloadHash(answers: Record<string, string[]>): string {
    const sortedEntries = Object.entries(answers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()]);
    return createHash('sha256').update(JSON.stringify(sortedEntries)).digest('hex');
  }

  /**
   * Génère une clé d'idempotence stable à partir de l'utilisateur, du quiz et du payload
   * ou utilise la clé explicitement fournie par le client (en-tête Idempotency-Key).
   */
  generateKey(
    userId: string,
    quizId: string,
    payloadHash: string,
    clientKey?: string | null,
  ): string {
    if (clientKey && clientKey.trim().length > 0) {
      return `idempotency:${userId}:${quizId}:${clientKey.trim()}`;
    }

    return `auto-dedup:${userId}:${quizId}:${payloadHash}`;
  }

  /**
   * Exécute une opération avec garantie d'idempotence, déduplication des requêtes concurrentes
   * et rejet 422 en cas de collision avec un payload différent.
   */
  async executeWithIdempotency(
    key: string,
    payloadHash: string,
    operation: () => Promise<QuizAttemptResultDto>,
  ): Promise<QuizAttemptResultDto> {
    this.cleanExpired();

    // 1. Vérifier si un résultat a déjà été mis en cache pour cette clé
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.payloadHash !== payloadHash) {
        this.logger.warn(`[Idempotency] Collision 422 : clé ${key} réutilisée avec un payload différent`);
        throw new UnprocessableEntityException(
          'Cette clé d\'idempotence a déjà été utilisée avec un corps de réponses différent.',
        );
      }

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
          payloadHash,
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
