import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface UserRequestRecord {
  timestamps: number[];
}

@Injectable()
export class AiRateLimiterService {
  private readonly windowMs = 60 * 60 * 1000; // 1 heure
  private readonly maxRequestsPerHour: number;
  private readonly records = new Map<string, UserRequestRecord>();

  constructor() {
    const configuredLimit = parseInt(process.env.AI_RATE_LIMIT_HOURLY || '20', 10);
    this.maxRequestsPerHour = isNaN(configuredLimit) || configuredLimit <= 0 ? 20 : configuredLimit;
  }

  /**
   * Vérifie et enregistre une requête de chat pour l'utilisateur.
   * Lève une exception 429 Too Many Requests si le quota horaire est dépassé.
   */
  checkAndRecord(userId: string): void {
    const now = Date.now();
    const userRecord = this.records.get(userId) || { timestamps: [] };

    // Purger les timestamps plus anciens que la fenêtre glissante d'une heure
    const validTimestamps = userRecord.timestamps.filter((ts) => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequestsPerHour) {
      const oldestValid = validTimestamps[0];
      const resetInMinutes = Math.ceil((this.windowMs - (now - oldestValid)) / 60000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Limite de requêtes IA atteinte (${this.maxRequestsPerHour} messages/heure). Réessaye dans ${resetInMinutes} minute(s).`,
          retryAfterMinutes: resetInMinutes,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    validTimestamps.push(now);
    this.records.set(userId, { timestamps: validTimestamps });
  }

  /**
   * Récupère le nombre de requêtes restantes pour l'heure en cours.
   */
  getRemainingQuota(userId: string): number {
    const now = Date.now();
    const userRecord = this.records.get(userId);
    if (!userRecord) return this.maxRequestsPerHour;

    const validCount = userRecord.timestamps.filter((ts) => now - ts < this.windowMs).length;
    return Math.max(0, this.maxRequestsPerHour - validCount);
  }

  /**
   * Récupère la limite horaire configurée.
   */
  getHourlyLimit(): number {
    return this.maxRequestsPerHour;
  }
}
