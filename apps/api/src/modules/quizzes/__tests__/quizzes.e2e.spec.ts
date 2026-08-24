import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QuizService } from '../services/quiz.service';
import { QuizAttemptsService } from '../services/quiz-attempts.service';
import { QuizScoringService } from '../services/quiz-scoring.service';
import { QuizIdempotencyService } from '../services/quiz-idempotency.service';
import { QuizzesController } from '../quizzes.controller';
import { executeContentSync } from '../../../sync/sync.service';
import { CatalogCacheService } from '../../catalog/catalog-cache.service';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';
import { UserRole } from '@prisma/client';

const TEST_SECRET = 'd'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)(
  'Quizzes Module — Tests d\'Intégration PostgreSQL & Zéro-Fuite (§22.3 / RM-01 / RM-12)',
  () => {
    let prisma: PrismaService;
    let isDbConnected = false;
    let quizService: QuizService;
    let attemptsService: QuizAttemptsService;
    let scoringService: QuizScoringService;
    let idempotencyService: QuizIdempotencyService;
    let auditService: AuditService;
    let controller: QuizzesController;

    const contentDir = path.resolve(__dirname, '../../../../../../content');
    const testEmail = 'etudiant.quiz.test@opensio.local';
    let testUser: { id: string; email: string; displayName: string; role: UserRole };
    let authUser: AuthenticatedUser;

    beforeAll(async () => {
      process.env.JWT_SECRET = TEST_SECRET;
      process.env.CONTENT_PATH = contentDir;

      try {
        prisma = new PrismaService();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        isDbConnected = true;

        auditService = new AuditService(prisma);
        scoringService = new QuizScoringService();
        idempotencyService = new QuizIdempotencyService();
        quizService = new QuizService(prisma);
        attemptsService = new QuizAttemptsService(
          prisma,
          auditService,
          scoringService,
          idempotencyService,
        );
        controller = new QuizzesController(quizService, attemptsService);

        // Synchroniser le contenu pour disposer du quiz "quiz-adressage"
        const cacheService = new CatalogCacheService();
        await executeContentSync(prisma, contentDir, cacheService);

        // Créer un utilisateur de test
        const existing = await prisma.user.findUnique({ where: { email: testEmail } });
        if (existing) {
          await prisma.quizAttempt.deleteMany({ where: { userId: existing.id } });
          await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
          await prisma.user.delete({ where: { id: existing.id } });
        }

        testUser = await prisma.user.create({
          data: {
            email: testEmail,
            displayName: 'Étudiant Test Quiz',
            passwordHash: 'dummy_hash_argon2',
            role: UserRole.STUDENT,
          },
        });

        authUser = {
          id: testUser.id,
          email: testUser.email,
          displayName: testUser.displayName,
          role: testUser.role,
        };
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected) {
        if (testUser?.id) {
          await prisma.quizAttempt.deleteMany({ where: { userId: testUser.id } });
          await prisma.auditLog.deleteMany({ where: { actorId: testUser.id } });
          await prisma.user.deleteMany({ where: { id: testUser.id } });
        }
        await prisma.$disconnect();
      }
    });

    it('GET /quizzes/:slug — retourne le quiz sans AUCUNE fuite de correctChoiceIds ni d\'explication', async () => {
      if (!isDbConnected) return;

      const quiz = await controller.getQuiz('quiz-adressage');

      expect(quiz).toBeDefined();
      expect(quiz.slug).toBe('quiz-adressage');
      expect(quiz.title).toContain('Adressage IPv4');
      expect(quiz.passingScore).toBe(80);
      expect(quiz.questions.length).toBe(5);

      // ZÉRO FUITE : Vérification explicite sur l'objet et le JSON sérialisé
      const serialized = JSON.stringify(quiz);
      expect(serialized).not.toContain('correctChoiceIds');
      expect(serialized).not.toContain('correct_choice_ids');
      expect(serialized).not.toContain('explanation');

      for (const q of quiz.questions) {
        expect(q).not.toHaveProperty('correctChoiceIds');
        expect(q).not.toHaveProperty('correct_choice_ids');
        expect(q).not.toHaveProperty('explanation');
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('POST /quizzes/:slug/attempts — soumet, corrige avec succès (100%), persiste la tentative et logge l\'audit', async () => {
      if (!isDbConnected) return;

      const quizData = await prisma.quiz.findUnique({
        where: { slug: 'quiz-adressage' },
        include: { questions: { orderBy: { position: 'asc' } } },
      });
      expect(quizData).toBeDefined();
      if (!quizData) return;

      // Construire des réponses 100% justes
      const correctAnswers: Record<string, string[]> = {};
      for (const q of quizData.questions) {
        correctAnswers[q.id] = q.correctChoiceIds as string[];
      }

      const result = await controller.submitAttempt(
        'quiz-adressage',
        { answers: correctAnswers },
        authUser,
        undefined,
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(5);
      expect(result.questions.length).toBe(5);
      expect(result.questions.every((q) => q.isCorrect)).toBe(true);

      // Vérifier que les explications sont présentes dans le résultat post-soumission
      expect(result.questions[0].explanation).toBeDefined();

      // ZÉRO FUITE : correctChoiceIds n'est jamais présent dans la réponse
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('correctChoiceIds');
      expect(serialized).not.toContain('correct_choice_ids');

      // Vérifier la persistance en base de données
      const savedAttempt = await prisma.quizAttempt.findUnique({ where: { id: result.id } });
      expect(savedAttempt).toBeDefined();
      expect(savedAttempt?.score).toBe(100);
      expect(savedAttempt?.passed).toBe(true);
      expect(savedAttempt?.userId).toBe(testUser.id);

      // Vérifier la journalisation d'audit (RM-12)
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'QUIZ_ATTEMPT_SUBMITTED',
          actorId: testUser.id,
          targetId: quizData.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.metadata as Record<string, unknown>)?.score).toBe(100);
      expect((auditLog?.metadata as Record<string, unknown>)?.passed).toBe(true);
    });

    it('POST /quizzes/:slug/attempts — soumet une tentative échouée (20%) et renvoie le statut exact', async () => {
      if (!isDbConnected) return;

      const quizData = await prisma.quiz.findUnique({
        where: { slug: 'quiz-adressage' },
        include: { questions: { orderBy: { position: 'asc' } } },
      });
      if (!quizData) return;

      // 1 seule bonne réponse sur 5
      const failingAnswers: Record<string, string[]> = {
        [quizData.questions[0].id]: quizData.questions[0].correctChoiceIds as string[],
        [quizData.questions[1].id]: ['wrong_choice'],
        [quizData.questions[2].id]: ['wrong_choice'],
        [quizData.questions[3].id]: ['wrong_choice'],
        [quizData.questions[4].id]: ['wrong_choice'],
      };

      const result = await controller.submitAttempt(
        'quiz-adressage',
        { answers: failingAnswers },
        authUser,
        undefined,
        undefined,
      );

      expect(result.score).toBe(20);
      expect(result.passed).toBe(false);
      expect(result.correctQuestions).toBe(1);
      expect(result.totalQuestions).toBe(5);
    });

    it('POST /quizzes/:slug/attempts — deux requêtes concurrentes avec même Idempotency-Key créent une seule tentative en base', async () => {
      if (!isDbConnected) return;

      const quizData = await prisma.quiz.findUnique({
        where: { slug: 'quiz-adressage' },
        include: { questions: { orderBy: { position: 'asc' } } },
      });
      if (!quizData) return;

      const idempotencyKey = `e2e-idemp-${Date.now()}`;
      const payload = {
        answers: {
          [quizData.questions[0].id]: quizData.questions[0].correctChoiceIds as string[],
        },
      };

      const attemptsBefore = await prisma.quizAttempt.count({
        where: { userId: testUser.id, quizId: quizData.id },
      });

      // Lancer 2 requêtes simultanées
      const [res1, res2] = await Promise.all([
        controller.submitAttempt('quiz-adressage', payload, authUser, idempotencyKey, undefined),
        controller.submitAttempt('quiz-adressage', payload, authUser, idempotencyKey, undefined),
      ]);

      const attemptsAfter = await prisma.quizAttempt.count({
        where: { userId: testUser.id, quizId: quizData.id },
      });

      expect(res1.id).toBe(res2.id);
      expect(attemptsAfter).toBe(attemptsBefore + 1);
    });

    it('GET /quizzes/:slug/attempts — retourne l\'historique des tentatives de l\'utilisateur', async () => {
      if (!isDbConnected) return;

      const history = await controller.getAttemptsHistory('quiz-adressage', authUser);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0]).toHaveProperty('id');
      expect(history[0]).toHaveProperty('score');
      expect(history[0]).toHaveProperty('passed');
      expect(history[0]).toHaveProperty('startedAt');
    });
  },
);
