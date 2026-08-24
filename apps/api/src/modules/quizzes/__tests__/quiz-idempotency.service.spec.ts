import { describe, expect, it, beforeEach } from 'vitest';
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
    const key = service.generateKey('user-1', 'quiz-1', { q1: ['a'] }, 'client-uuid-123');
    expect(key).toBe('idempotency:user-1:quiz-1:client-uuid-123');
  });

  it('génère une clé automatique reproductible basée sur le hash du payload', () => {
    const answers1 = { q1: ['a', 'b'], q2: ['c'] };
    const answers2 = { q2: ['c'], q1: ['b', 'a'] }; // ordre différent

    const key1 = service.generateKey('user-1', 'quiz-1', answers1);
    const key2 = service.generateKey('user-1', 'quiz-1', answers2);

    expect(key1).toBe(key2);
    expect(key1).toContain('auto-dedup:user-1:quiz-1:');
  });

  it('exécute l\'opération et met en cache le résultat', async () => {
    let callCount = 0;
    const op = async () => {
      callCount += 1;
      return mockResult;
    };

    const key = 'test-key-1';
    const res1 = await service.executeWithIdempotency(key, op);
    const res2 = await service.executeWithIdempotency(key, op);

    expect(callCount).toBe(1);
    expect(res1).toEqual(mockResult);
    expect(res2).toEqual(mockResult);
  });

  it('gère les requêtes concurrentes simultanées sans doubler l\'exécution', async () => {
    let callCount = 0;
    const op = async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { ...mockResult, id: `attempt-${callCount}` };
    };

    const key = 'test-concurrent-key';
    const [res1, res2] = await Promise.all([
      service.executeWithIdempotency(key, op),
      service.executeWithIdempotency(key, op),
    ]);

    expect(callCount).toBe(1);
    expect(res1.id).toBe('attempt-1');
    expect(res2.id).toBe('attempt-1');
  });
});
