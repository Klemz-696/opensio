import { describe, expect, it, beforeEach } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { QuizIdempotencyService } from '../services/quiz-idempotency.service';
import type { QuizAttemptResultDto } from '../dto/quiz-responses.dto';

describe('QuizIdempotencyService', () => {
  let service: QuizIdempotencyService;

  beforeEach(() => {
    service = new QuizIdempotencyService();
  });

  const mockResult: QuizAttemptResultDto = {
    id: 'attempt-123',
    quizId: 'quiz-abc',
    quizSlug: 'quiz-adressage',
    score: 80,
    passed: true,
    passingScore: 80,
    totalQuestions: 5,
    correctQuestions: 4,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questions: [],
  };

  it('génère une clé basée sur la clé client fournie', () => {
    const hash = service.computePayloadHash({ q1: ['a'] });
    const key = service.generateKey('user-1', 'quiz-1', hash, 'client-uuid-123');
    expect(key).toBe('idempotency:user-1:quiz-1:client-uuid-123');
  });

  it('génère une clé automatique reproductible basée sur le hash du payload', () => {
    const answers1 = { q1: ['a', 'b'], q2: ['c'] };
    const answers2 = { q2: ['c'], q1: ['b', 'a'] }; // ordre différent

    const hash1 = service.computePayloadHash(answers1);
    const hash2 = service.computePayloadHash(answers2);

    expect(hash1).toBe(hash2);

    const key1 = service.generateKey('user-1', 'quiz-1', hash1);
    const key2 = service.generateKey('user-1', 'quiz-1', hash2);

    expect(key1).toBe(key2);
    expect(key1).toContain('auto-dedup:user-1:quiz-1:');
  });

  it('exécute l\'opération et met en cache le résultat', async () => {
    let callCount = 0;
    const op = async () => {
      callCount += 1;
      return mockResult;
    };

    const hash = 'hash-1';
    const key = 'test-key-1';
    const res1 = await service.executeWithIdempotency(key, hash, op);
    const res2 = await service.executeWithIdempotency(key, hash, op);

    expect(callCount).toBe(1);
    expect(res1).toEqual(mockResult);
    expect(res2).toEqual(mockResult);
  });

  it('rejette avec 422 si la même Idempotency-Key est réutilisée avec un payload différent', async () => {
    let callCount = 0;
    const op = async () => {
      callCount += 1;
      return mockResult;
    };

    const key = 'idempotency:user-1:quiz-1:custom-key-123';
    const hash1 = service.computePayloadHash({ q1: ['a'] });
    const hash2 = service.computePayloadHash({ q1: ['b'] }); // payload différent

    // 1er appel avec hash1 -> succès
    const res1 = await service.executeWithIdempotency(key, hash1, op);
    expect(res1).toEqual(mockResult);
    expect(callCount).toBe(1);

    // 2ème appel avec même clé mais hash2 -> 422 UnprocessableEntityException
    await expect(service.executeWithIdempotency(key, hash2, op)).rejects.toThrow(
      UnprocessableEntityException,
    );

    // Le compteur d'opérations n'a pas bougé (pas de 2ème création)
    expect(callCount).toBe(1);
  });

  it('gère les requêtes concurrentes simultanées sans doubler l\'exécution', async () => {
    let callCount = 0;
    const op = async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { ...mockResult, id: `attempt-${callCount}` };
    };

    const hash = 'hash-concurrent';
    const key = 'test-concurrent-key';
    const [res1, res2] = await Promise.all([
      service.executeWithIdempotency(key, hash, op),
      service.executeWithIdempotency(key, hash, op),
    ]);

    expect(callCount).toBe(1);
    expect(res1.id).toBe('attempt-1');
    expect(res2.id).toBe('attempt-1');
  });
});
