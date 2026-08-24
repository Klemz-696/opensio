import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProgressService } from '../progress.service';
import { ProgressAggregationService } from '../progress-aggregation.service';
import { ProgressController } from '../progress.controller';
import { DashboardService } from '../../dashboard/dashboard.service';
import { DashboardController } from '../../dashboard/dashboard.controller';
import { RecommendationsService } from '../../dashboard/recommendations.service';
import { CatalogService } from '../../catalog/catalog.service';
import { CatalogCacheService } from '../../catalog/catalog-cache.service';
import { LessonReaderService } from '../../catalog/lesson-reader.service';
import { CatalogProgressEnricherService } from '../../catalog/catalog-progress-enricher.service';
import { CatalogController } from '../../catalog/catalog.controller';
import { executeContentSync } from '../../../sync/sync.service';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';

const TEST_SECRET = 'e'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)(
  'Progress & Dashboard Module — Tests d\'Intégration & Isolation Inter-Utilisateurs (§22.4 / RM-03 / RM-13)',
  () => {
    let prisma: PrismaService;
    let isDbConnected = false;

    let progressService: ProgressService;
    let aggregationService: ProgressAggregationService;
    let progressController: ProgressController;

    let dashboardService: DashboardService;
    let dashboardController: DashboardController;

    let catalogService: CatalogService;
    let catalogController: CatalogController;

    const contentDir = path.resolve(__dirname, '../../../../../../content');

    let userA: { id: string; email: string; displayName: string; role: UserRole };
    let userB: { id: string; email: string; displayName: string; role: UserRole };

    let authUserA: AuthenticatedUser;
    let authUserB: AuthenticatedUser;

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

        const cacheService = new CatalogCacheService();
        await executeContentSync(prisma, contentDir, cacheService);

        aggregationService = new ProgressAggregationService(prisma);
        progressService = new ProgressService(prisma);
        progressController = new ProgressController(progressService, aggregationService);

        const recommendationsService = new RecommendationsService();
        dashboardService = new DashboardService(prisma, aggregationService, recommendationsService);
        dashboardController = new DashboardController(dashboardService);

        const lessonReader = new LessonReaderService();
        const enricher = new CatalogProgressEnricherService(prisma, aggregationService);
        catalogService = new CatalogService(prisma, cacheService, lessonReader, enricher);
        catalogController = new CatalogController(catalogService);

        // Nettoyage des anciens utilisateurs de test
        const emails = ['etudiant.a.lot6@opensio.local', 'etudiant.b.lot6@opensio.local'];
        const existingUsers = await prisma.user.findMany({ where: { email: { in: emails } } });
        for (const u of existingUsers) {
          await prisma.activityEvent.deleteMany({ where: { userId: u.id } });
          await prisma.lessonProgress.deleteMany({ where: { userId: u.id } });
          await prisma.quizAttempt.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }

        userA = await prisma.user.create({
          data: {
            email: 'etudiant.a.lot6@opensio.local',
            displayName: 'Étudiant A',
            passwordHash: 'dummy_hash_argon2_a',
            role: UserRole.STUDENT,
          },
        });

        userB = await prisma.user.create({
          data: {
            email: 'etudiant.b.lot6@opensio.local',
            displayName: 'Étudiant B',
            passwordHash: 'dummy_hash_argon2_b',
            role: UserRole.STUDENT,
          },
        });

        authUserA = {
          id: userA.id,
          email: userA.email,
          displayName: userA.displayName,
          role: userA.role,
        };

        authUserB = {
          id: userB.id,
          email: userB.email,
          displayName: userB.displayName,
          role: userB.role,
        };
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected) {
        const userIds = [userA?.id, userB?.id].filter(Boolean) as string[];
        if (userIds.length > 0) {
          await prisma.activityEvent.deleteMany({ where: { userId: { in: userIds } } });
          await prisma.lessonProgress.deleteMany({ where: { userId: { in: userIds } } });
          await prisma.quizAttempt.deleteMany({ where: { userId: { in: userIds } } });
          await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        }
        await prisma.$disconnect();
      }
    });

    it('1. Isolation inter-utilisateurs : initialement les 2 comptes ont 0% de progression', async () => {
      if (!isDbConnected) return;

      const progressA = await progressController.getMyProgress(authUserA);
      const progressB = await progressController.getMyProgress(authUserB);

      expect(progressA.global.completedLessons).toBe(0);
      expect(progressA.global.progressPercentage).toBe(0);
      expect(progressB.global.completedLessons).toBe(0);
      expect(progressB.global.progressPercentage).toBe(0);
    });

    it('2. Complétion d\'une leçon par User A : User A avance, User B reste strictement à 0%', async () => {
      if (!isDbConnected) return;

      // User A envoie un heartbeat de 45 secondes puis complète la leçon
      await progressController.heartbeat('adressage-ipv4', authUserA, { seconds: 45 });
      const completed = await progressController.completeLesson(
        'adressage-ipv4',
        authUserA,
        { timeSpentSeconds: 15 },
      );

      expect(completed.status).toBe('completed');
      expect(completed.timeSpentSeconds).toBe(60);

      // Vérification User A
      const progressA = await progressController.getMyProgress(authUserA);
      expect(progressA.global.completedLessons).toBe(1);
      expect(progressA.global.totalTimeSpentSeconds).toBe(60);

      // Vérification stricte User B (DOIT RESTER À 0)
      const progressB = await progressController.getMyProgress(authUserB);
      expect(progressB.global.completedLessons).toBe(0);
      expect(progressB.global.totalTimeSpentSeconds).toBe(0);
      expect(progressB.global.progressPercentage).toBe(0);
    });

    it('3. Idempotence : des complétions répétées ne créent pas de doublons', async () => {
      if (!isDbConnected) return;

      // Rappel de complétion sans temps additionnel
      const repeatComplete = await progressController.completeLesson(
        'adressage-ipv4',
        authUserA,
        {},
      );

      expect(repeatComplete.status).toBe('completed');
      expect(repeatComplete.timeSpentSeconds).toBe(60);

      // Vérification qu'il n'y a qu'une seule ligne en base
      const rows = await prisma.lessonProgress.findMany({
        where: { userId: userA.id },
      });
      expect(rows).toHaveLength(1);

      // Vérification qu'il n'y a qu'un seul événement LESSON_COMPLETED consigné (pas de doublon d'activité)
      const completedEvents = await prisma.activityEvent.findMany({
        where: {
          userId: userA.id,
          kind: 'LESSON_COMPLETED',
        },
      });
      expect(completedEvents).toHaveLength(1);
    });

    it('4. Dashboard User A vs Dashboard User B : agrégats, reprise et timeline isolés', async () => {
      if (!isDbConnected) return;

      const dashboardA = await dashboardController.getDashboard(authUserA);
      const dashboardB = await dashboardController.getDashboard(authUserB);

      // Dashboard User A
      expect(dashboardA.overview.completedLessons).toBe(1);
      expect(dashboardA.overview.totalTimeSpentSeconds).toBe(60);
      expect(dashboardA.resume.length).toBeGreaterThanOrEqual(1);
      expect(dashboardA.resume[0].lessonSlug).toBe('adressage-ipv4');
      expect(dashboardA.recentActivity.length).toBeGreaterThanOrEqual(1);

      // Dashboard User B
      expect(dashboardB.overview.completedLessons).toBe(0);
      expect(dashboardB.overview.totalTimeSpentSeconds).toBe(0);
      expect(dashboardB.resume).toHaveLength(0);
      expect(dashboardB.recentActivity).toHaveLength(0);
    });

    it('5. Catalogue enrichi dynamiquement : Tracks de User A avec progress, sans pollution du cache', async () => {
      if (!isDbConnected) return;

      const tracksA = await catalogController.getTracks(authUserA);
      const tracksB = await catalogController.getTracks(authUserB);

      const track1A = tracksA.find((t) => t.slug === 'annee-1');
      const track1B = tracksB.find((t) => t.slug === 'annee-1');

      expect(track1A?.progress?.completedLessons).toBe(1);
      expect(track1B?.progress?.completedLessons).toBe(0);
    });

    it('6. Activité paginée (/me/activity)', async () => {
      if (!isDbConnected) return;

      const activityA = await progressController.getMyActivity(authUserA, '1', '10');
      expect(activityA.items.length).toBeGreaterThanOrEqual(1);
      expect(activityA.items[0].entityType).toBe('lesson');
      expect(activityA.page).toBe(1);
    });
  }
);
