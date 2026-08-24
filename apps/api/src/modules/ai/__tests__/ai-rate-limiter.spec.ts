import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiRateLimiterService } from '../services/ai-rate-limiter.service';

describe('AiRateLimiterService (Limitation de débit)', () => {
  let rateLimiter: AiRateLimiterService;

  beforeEach(() => {
    process.env.AI_RATE_LIMIT_HOURLY = '3';
    rateLimiter = new AiRateLimiterService();
  });

  it('autorise les requêtes dans la limite du quota horaire', () => {
    const userId = 'user-lucas';
    expect(rateLimiter.getRemainingQuota(userId)).toBe(3);

    rateLimiter.checkAndRecord(userId);
    expect(rateLimiter.getRemainingQuota(userId)).toBe(2);

    rateLimiter.checkAndRecord(userId);
    expect(rateLimiter.getRemainingQuota(userId)).toBe(1);

    rateLimiter.checkAndRecord(userId);
    expect(rateLimiter.getRemainingQuota(userId)).toBe(0);
  });

  it('lève une exception 429 Too Many Requests dès dépassement du quota', () => {
    const userId = 'user-lucas';

    rateLimiter.checkAndRecord(userId);
    rateLimiter.checkAndRecord(userId);
    rateLimiter.checkAndRecord(userId);

    expect(() => rateLimiter.checkAndRecord(userId)).toThrow(HttpException);

    try {
      rateLimiter.checkAndRecord(userId);
    } catch (err) {
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(httpErr.message).toContain('Limite de requêtes IA atteinte');
    }
  });

  it('isole strictement les quotas entre deux utilisateurs distincts', () => {
    const lucas = 'user-lucas';
    const emma = 'user-emma';

    rateLimiter.checkAndRecord(lucas);
    rateLimiter.checkAndRecord(lucas);
    rateLimiter.checkAndRecord(lucas);

    expect(rateLimiter.getRemainingQuota(lucas)).toBe(0);
    expect(rateLimiter.getRemainingQuota(emma)).toBe(3);

    expect(() => rateLimiter.checkAndRecord(emma)).not.toThrow();
    expect(rateLimiter.getRemainingQuota(emma)).toBe(2);
  });
});
