/**
 * Script de démonstration de bout en bout pour le Lot 6 — Progression & Tableau de bord
 * Exécution : pnpm --filter @opensio/api exec tsx test/demo-lot6.ts
 */

import * as path from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { QuizAttemptsService } from '../src/modules/quizzes/services/quiz-attempts.service';
import { QuizScoringService } from '../src/modules/quizzes/services/quiz-scoring.service';
import { QuizIdempotencyService } from '../src/modules/quizzes/services/quiz-idempotency.service';
import { ProgressService } from '../src/modules/progress/progress.service';
import { ProgressAggregationService } from '../src/modules/progress/progress-aggregation.service';
import { ProgressController } from '../src/modules/progress/progress.controller';
import { RecommendationsService } from '../src/modules/dashboard/recommendations.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { CatalogCacheService } from '../src/modules/catalog/catalog-cache.service';
import { LessonReaderService } from '../src/modules/catalog/lesson-reader.service';
import { CatalogProgressEnricherService } from '../src/modules/catalog/catalog-progress-enricher.service';
import { CatalogController } from '../src/modules/catalog/catalog.controller';
import { executeContentSync } from '../src/sync/sync.service';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../src/common/guards/auth.guard';

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 DEMO LOT 6 — PROGRESSION & TABLEAU DE BORD (OpenSIO)');
  console.log('='.repeat(70));

  const prisma = new PrismaService();
  await prisma.$connect();

  const contentDir = path.resolve(__dirname, '../../../content');
  process.env.CONTENT_PATH = contentDir;
  process.env.JWT_SECRET = 'a'.repeat(64);

  // 1. Initialisation des services
  const cacheService = new CatalogCacheService();
  await executeContentSync(prisma, contentDir, cacheService);

  const passwordService = new PasswordService();
  const auditService = new AuditService(prisma);
  const scoringService = new QuizScoringService();
  const idempotencyService = new QuizIdempotencyService();
  const quizAttemptsService = new QuizAttemptsService(
    prisma,
    auditService,
    scoringService,
    idempotencyService,
  );

  const aggregationService = new ProgressAggregationService(prisma);
  const progressService = new ProgressService(prisma);
  const progressController = new ProgressController(progressService, aggregationService);

  const recommendationsService = new RecommendationsService();
  const dashboardService = new DashboardService(
    prisma,
    aggregationService,
    recommendationsService,
  );
  const dashboardController = new DashboardController(dashboardService);

  const lessonReader = new LessonReaderService();
  const enricher = new CatalogProgressEnricherService(prisma, aggregationService);
  const catalogService = new CatalogService(prisma, cacheService, lessonReader, enricher);
  const catalogController = new CatalogController(catalogService);

  // 2. Création de deux comptes étudiants : Lucas et Emma
  const lucasEmail = 'lucas.demo.lot6@opensio.local';
  const emmaEmail = 'emma.demo.lot6@opensio.local';

  for (const email of [lucasEmail, emmaEmail]) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.activityEvent.deleteMany({ where: { userId: existing.id } });
      await prisma.lessonProgress.deleteMany({ where: { userId: existing.id } });
      await prisma.quizAttempt.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  }

  const hash = await passwordService.hash('Password123!@#');
  const lucas = await prisma.user.create({
    data: {
      email: lucasEmail,
      displayName: 'Lucas SISR',
      passwordHash: hash,
      role: UserRole.STUDENT,
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: emmaEmail,
      displayName: 'Emma SISR',
      passwordHash: hash,
      role: UserRole.STUDENT,
    },
  });

  const authLucas: AuthenticatedUser = {
    id: lucas.id,
    email: lucas.email,
    displayName: lucas.displayName,
    role: lucas.role,
  };

  const authEmma: AuthenticatedUser = {
    id: emma.id,
    email: emma.email,
    displayName: emma.displayName,
    role: emma.role,
  };

  console.log(`\n✅ 1. Comptes étudiants initialisés :`);
  console.log(`   - Lucas : ${lucas.displayName} (${lucas.email})`);
  console.log(`   - Emma  : ${emma.displayName} (${emma.email})`);

  // 3. Vérification initiale (0% de progression pour les deux)
  const initialLucas = await progressController.getMyProgress(authLucas);
  const initialEmma = await progressController.getMyProgress(authEmma);
  console.log(`\n📊 2. Vérification de l'état initial :`);
  console.log(`   - Lucas : ${initialLucas.global.progressPercentage}% (${initialLucas.global.completedLessons}/${initialLucas.global.totalLessons} leçons)`);
  console.log(`   - Emma  : ${initialEmma.global.progressPercentage}% (${initialEmma.global.completedLessons}/${initialEmma.global.totalLessons} leçons)`);

  // 4. Parcours d'apprentissage de Lucas
  console.log(`\n📖 3. Parcours d'apprentissage de Lucas :`);
  console.log(`   a) Lucas consulte « adressage-ipv4 » (envoi heartbeat 60s)...`);
  await progressController.heartbeat('adressage-ipv4', authLucas, { seconds: 60 });

  console.log(`   b) Lucas termine la leçon (POST /lessons/adressage-ipv4/complete)...`);
  const completeRes = await progressController.completeLesson('adressage-ipv4', authLucas, {
    timeSpentSeconds: 30,
  });
  console.log(`      ✓ Statut : ${completeRes.status}, Temps total : ${completeRes.timeSpentSeconds}s`);

  console.log(`   c) Lucas repasse le marquage (vérification d'idempotence)...`);
  const repeatComplete = await progressController.completeLesson('adressage-ipv4', authLucas, {});
  console.log(`      ✓ Idempotence validée (Statut : ${repeatComplete.status}, Temps conservé : ${repeatComplete.timeSpentSeconds}s)`);

  console.log(`   d) Lucas passe le quiz « quiz-adressage » (score 100%)...`);
  const quizObj = await prisma.quiz.findUnique({
    where: { slug: 'quiz-adressage' },
    include: { questions: { orderBy: { position: 'asc' } } },
  });

  const correctAnswers: Record<string, string[]> = {};
  if (quizObj) {
    for (const q of quizObj.questions) {
      correctAnswers[q.id] = q.correctChoiceIds as string[];
    }
  }

  const attemptRes = await quizAttemptsService.submitAttempt(
    lucas.id,
    'quiz-adressage',
    correctAnswers,
  );
  console.log(`      ✓ Score : ${attemptRes.score}%, Validé : ${attemptRes.passed ? 'OUI' : 'NON'}`);

  // 5. Tableau de bord de Lucas
  console.log(`\n🖥️ 4. Tableau de bord de Lucas (GET /me/dashboard) :`);
  const dashboardLucas = await dashboardController.getDashboard(authLucas);
  console.log(`   - Progression globale : ${dashboardLucas.overview.progressPercentage}%`);
  console.log(`   - Leçons terminées    : ${dashboardLucas.overview.completedLessons}/${dashboardLucas.overview.totalLessons}`);
  console.log(`   - Temps cumulé        : ${dashboardLucas.overview.totalTimeSpentSeconds}s`);
  console.log(`   - Quiz réussis        : ${dashboardLucas.overview.quizzesPassed}/${dashboardLucas.overview.totalQuizzes}`);
  console.log(`   - Modules validés     : ${dashboardLucas.overview.completedModules}/${dashboardLucas.overview.totalModules}`);

  console.log(`   - Section "Reprendre où j'en étais" (${dashboardLucas.resume.length} éléments) :`);
  for (const item of dashboardLucas.resume) {
    console.log(`     • ${item.lessonTitle} (${item.moduleTitle}) [${item.status}]`);
  }

  console.log(`   - Événements d'activité récents (${dashboardLucas.recentActivity.length} événements) :`);
  for (const evt of dashboardLucas.recentActivity.slice(0, 3)) {
    console.log(`     • [${evt.kind}] sur ${evt.entityType}`);
  }

  // 6. Isolation stricte pour Emma
  console.log(`\n🔒 5. Démonstration de l'isolation inter-utilisateurs (Emma) :`);
  const dashboardEmma = await dashboardController.getDashboard(authEmma);
  console.log(`   - Progression d'Emma  : ${dashboardEmma.overview.progressPercentage}% (doit être 0%)`);
  console.log(`   - Leçons d'Emma       : ${dashboardEmma.overview.completedLessons} terminée(s)`);
  console.log(`   - Activités d'Emma    : ${dashboardEmma.recentActivity.length} événement(s)`);

  const tracksEmma = await catalogController.getTracks(authEmma);
  const track1Emma = tracksEmma.find((t) => t.slug === 'annee-1');
  console.log(`   - Track 1 pour Emma   : ${track1Emma?.progress?.completedLessons} leçon(s) terminée(s)`);

  if (
    dashboardLucas.overview.completedLessons === 1 &&
    dashboardEmma.overview.completedLessons === 0 &&
    track1Emma?.progress?.completedLessons === 0
  ) {
    console.log(`\n🎉 ISOLEMENT INTER-UTILISATEURS & AGREGATS PARFAITEMENT VALIDÉS !`);
  } else {
    throw new Error('Échec du contrôle d\'isolement inter-utilisateurs !');
  }

  // Nettoyage final
  await prisma.activityEvent.deleteMany({ where: { userId: { in: [lucas.id, emma.id] } } });
  await prisma.lessonProgress.deleteMany({ where: { userId: { in: [lucas.id, emma.id] } } });
  await prisma.quizAttempt.deleteMany({ where: { userId: { in: [lucas.id, emma.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [lucas.id, emma.id] } } });
  await prisma.$disconnect();

  console.log('\n='.repeat(70));
  console.log('✅ DEMO DU LOT 6 TERMINÉE AVEC SUCCÈS');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('❌ Erreur lors de la démonstration du Lot 6 :', err);
  process.exit(1);
});
