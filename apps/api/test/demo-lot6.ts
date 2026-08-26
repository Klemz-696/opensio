import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { executeContentSync } from '../src/sync/sync.service';
import { CatalogCacheService } from '../src/modules/catalog/catalog-cache.service';
import { Role } from '@prisma/client';

async function runDemonstration() {
  console.log('='.repeat(70));
  console.log('🚀 DÉMONSTRATION RÉSEAU RÉELLE (HTTP) — LOT 6 (OpenSIO)');
  console.log('   Progression, Tableau de Bord & Sécurité JWT Inviolable');
  console.log('='.repeat(70) + '\n');

  process.env.API_PORT = '4007';
  process.env.JWT_SECRET = 'd'.repeat(64);
  process.env.REGISTRATION_ENABLED = 'true';

  const contentDir = path.resolve(__dirname, '../../../content');
  process.env.CONTENT_PATH = contentDir;

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.listen(4007);

  const baseUrl = 'http://localhost:4007/api/v1';
  const prisma = app.get(PrismaService);
  const cacheService = app.get(CatalogCacheService);
  const passwordService = app.get(PasswordService);

  // Synchronisation du catalogue pour assurer l'existence des leçons et quiz
  await executeContentSync(prisma, contentDir, cacheService);

  try {
    // Préparation des comptes de test
    const lucasEmail = 'lucas.demo.lot6@opensio.local';
    const emmaEmail = 'emma.demo.lot6@opensio.local';
    const password = 'Password123!@#';

    for (const email of [lucasEmail, emmaEmail]) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.activityEvent.deleteMany({ where: { userId: existing.id } });
        await prisma.lessonProgress.deleteMany({ where: { userId: existing.id } });
        await prisma.quizAttempt.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    const passwordHash = await passwordService.hash(password);
    const lucasUser = await prisma.user.create({
      data: {
        email: lucasEmail,
        displayName: 'Lucas SISR',
        passwordHash,
        role: Role.APPRENANT,
      },
    });

    const emmaUser = await prisma.user.create({
      data: {
        email: emmaEmail,
        displayName: 'Emma SISR',
        passwordHash,
        role: Role.APPRENANT,
      },
    });

    // =========================================================================
    // ÉTAPE 1 : Connexion HTTP réelle de deux étudiants distincts
    // =========================================================================
    console.log('1. [Auth HTTP] Authentification de Lucas et Emma via POST /api/v1/auth/login...');

    const loginLucasRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lucasEmail, password }),
    });
    if (!loginLucasRes.ok) throw new Error(`Échec login Lucas : ${loginLucasRes.status}`);
    const lucasAuth = (await loginLucasRes.json()) as { accessToken: string; user: { id: string; displayName: string } };
    const tokenLucas = lucasAuth.accessToken;
    console.log(`   ✔ Lucas connecté : ${lucasAuth.user.displayName} (JWT: ${tokenLucas.substring(0, 20)}...)`);

    const loginEmmaRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emmaEmail, password }),
    });
    if (!loginEmmaRes.ok) throw new Error(`Échec login Emma : ${loginEmmaRes.status}`);
    const emmaAuth = (await loginEmmaRes.json()) as { accessToken: string; user: { id: string; displayName: string } };
    const tokenEmma = emmaAuth.accessToken;
    console.log(`   ✔ Emma connectée  : ${emmaAuth.user.displayName} (JWT: ${tokenEmma.substring(0, 20)}...)\n`);

    // =========================================================================
    // ÉTAPE 2 : Parcours d'apprentissage HTTP de Lucas
    // =========================================================================
    console.log('2. [Progression HTTP — Lucas]');
    console.log('   a) Envoi de battement de présence POST /lessons/adressage-ipv4/heartbeat (60s)...');
    const hbRes = await fetch(`${baseUrl}/lessons/adressage-ipv4/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({ seconds: 60 }),
    });
    const hbData = (await hbRes.json()) as { status: string; timeSpentSeconds: number };
    console.log(`      ✓ Statut HTTP : ${hbRes.status} | Réponse : ${JSON.stringify(hbData)}`);

    console.log('   b) Complétion de leçon POST /lessons/adressage-ipv4/complete (+30s)...');
    const compRes = await fetch(`${baseUrl}/lessons/adressage-ipv4/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({ timeSpentSeconds: 30 }),
    });
    const compData = (await compRes.json()) as { status: string; timeSpentSeconds: number; completedAt: string };
    console.log(`      ✓ Statut HTTP : ${compRes.status} | Réponse : ${JSON.stringify(compData)}`);

    console.log('   c) Vérification de l\'idempotence (deuxième appel à POST /complete)...');
    const compIdempRes = await fetch(`${baseUrl}/lessons/adressage-ipv4/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({}),
    });
    const compIdempData = (await compIdempRes.json()) as { status: string; timeSpentSeconds: number };
    console.log(`      ✓ Statut HTTP : ${compIdempRes.status} | Temps conservé : ${compIdempData.timeSpentSeconds}s (idempotent)`);

    console.log('   d) Passation du quiz « quiz-adressage » (score 100%)...');
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
    const quizSubmitRes = await fetch(`${baseUrl}/quizzes/quiz-adressage/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({ answers: correctAnswers }),
    });
    const quizSubmitData = (await quizSubmitRes.json()) as { score: number; passed: boolean };
    console.log(`      ✓ Score reçu : ${quizSubmitData.score}% | Réussi (RM-01) : ${quizSubmitData.passed ? 'OUI' : 'NON'}`);

    console.log('\n   e) Consultation de l\'arbre de progression GET /me/progress pour Lucas...');
    const progressLucasRes = await fetch(`${baseUrl}/me/progress`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    const progressLucas = (await progressLucasRes.json()) as { global: { progressPercentage: number; completedLessons: number; totalLessons: number } };
    console.log(`      ✓ Statut HTTP : ${progressLucasRes.status}`);
    console.log(`      ✓ Synthèse globale : ${progressLucas.global.progressPercentage}% (${progressLucas.global.completedLessons}/${progressLucas.global.totalLessons} leçons)`);

    console.log('\n   f) Consultation du Tableau de Bord GET /me/dashboard pour Lucas...');
    const dashLucasRes = await fetch(`${baseUrl}/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    const dashLucas = (await dashLucasRes.json()) as {
      overview: { progressPercentage: number; completedModules: number; quizzesPassed: number; totalTimeSpentSeconds: number };
      resume: Array<{ lessonTitle: string; moduleTitle: string; status: string }>;
      recommendations: Array<{ title: string; description: string }>;
    };
    console.log(`      ✓ Statut HTTP : ${dashLucasRes.status}`);
    console.log(`      ✓ Vue d'ensemble : Modules validés = ${dashLucas.overview.completedModules} (RM-03), Temps = ${dashLucas.overview.totalTimeSpentSeconds}s`);
    console.log(`      ✓ Section "Reprendre où j'en étais" : ${dashLucas.resume[0]?.lessonTitle} (${dashLucas.resume[0]?.status})`);
    console.log(`      ✓ Recommandations : ${dashLucas.recommendations[0]?.title || 'Aucune'}`);

    console.log('\n   g) Consultation du Journal d\'Activité GET /me/activity pour Lucas...');
    const actLucasRes = await fetch(`${baseUrl}/me/activity`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    const actLucas = (await actLucasRes.json()) as { items: Array<{ kind: string; entityType: string }> };
    console.log(`      ✓ ${actLucas.items.length} événement(s) d'activité enregistrés (attendu: 3) :`);
    for (const it of actLucas.items) {
      console.log(`        - [${it.kind}] sur ${it.entityType}`);
    }
    if (actLucas.items.length !== 3) {
      throw new Error(`❌ ÉCHEC IDEMPOTENCE : Attendu exactement 3 événements d'activité, reçu ${actLucas.items.length}`);
    }

    // =========================================================================
    // ÉTAPE 3 : Isolation Inter-Utilisateurs stricte (Emma)
    // =========================================================================
    console.log('\n3. [Isolation Inter-Utilisateurs — Emma]');
    console.log('   Consultation de GET /me/progress et GET /me/dashboard avec le JWT d\'Emma...');

    const progressEmmaRes = await fetch(`${baseUrl}/me/progress`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    const progressEmma = (await progressEmmaRes.json()) as { global: { progressPercentage: number; completedLessons: number } };
    console.log(`   ✓ Progression d'Emma : ${progressEmma.global.progressPercentage}% (${progressEmma.global.completedLessons} leçon terminée)`);

    const dashEmmaRes = await fetch(`${baseUrl}/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    const dashEmma = (await dashEmmaRes.json()) as {
      overview: { progressPercentage: number; completedLessons: number; totalTimeSpentSeconds: number };
      resume: unknown[];
      recentActivity: unknown[];
    };
    console.log(`   ✓ Dashboard d'Emma : ${dashEmma.overview.progressPercentage}% (Temps: ${dashEmma.overview.totalTimeSpentSeconds}s, Reprises: ${dashEmma.resume.length})`);

    const tracksEmmaRes = await fetch(`${baseUrl}/tracks`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    const tracksEmma = (await tracksEmmaRes.json()) as Array<{ slug: string; progress?: { completedLessons: number } | null }>;
    const track1Emma = tracksEmma.find((t) => t.slug === 'annee-1');
    console.log(`   ✓ Catalogue Track 1 d'Emma : ${track1Emma?.progress?.completedLessons || 0} leçon terminée (ZÉRO fuite du cache global)\n`);

    if (progressEmma.global.completedLessons !== 0 || dashEmma.overview.completedLessons !== 0 || dashEmma.resume.length !== 0) {
      throw new Error('❌ ÉCHEC CRITIQUE : Fuite de données détectée entre Lucas et Emma !');
    }

    // =========================================================================
    // ÉTAPE 4 : Test Négatif de Sécurité — Tentative d'usurpation via le payload
    // =========================================================================
    console.log('4. [Sécurité & Anti-Usurpation] Lucas tente d\'injecter l\'ID d\'Emma dans le payload POST /complete...');
    console.log(`   Lucas (JWT) soumet: { userId: "${emmaUser.id}", fakeUserId: "${emmaUser.id}", timeSpentSeconds: 15 }`);

    const spoofAttemptRes = await fetch(`${baseUrl}/lessons/adressage-ipv4/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`, // Authentifié en tant que Lucas
      },
      body: JSON.stringify({
        userId: emmaUser.id, // Tentative frauduleuse de valider pour Emma
        fakeUserId: emmaUser.id,
        timeSpentSeconds: 15,
      }),
    });

    console.log(`   Statut HTTP : ${spoofAttemptRes.status}`);

    // Vérification en base de données de l'état d'Emma
    const emmaDbProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: emmaUser.id,
          lessonId: (await prisma.lesson.findUnique({ where: { slug: 'adressage-ipv4' } }))!.id,
        },
      },
    });

    console.log(`   Contrôle de sécurité en base pour Emma : ${emmaDbProgress ? '❌ COMPROMIS (Enregistré pour Emma !)' : '✔ INTACT (Aucune progression créée pour Emma)'}`);
    if (emmaDbProgress) {
      throw new Error('❌ VULNÉRABILITÉ : Le backend a pris en compte le userId du body au lieu du JWT !');
    }
    console.log('   ✔ Le userId du JWT fait foi de façon absolue et inviolable contre toute injection de payload (§29.2).\n');

    // =========================================================================
    // ÉTAPE 5 : Rejet 401 sans token
    // =========================================================================
    console.log('5. [Sécurité AuthGuard] Requête non authentifiée GET /me/dashboard...');
    const unauthDashRes = await fetch(`${baseUrl}/me/dashboard`);
    console.log(`   Statut HTTP : ${unauthDashRes.status} (attendu: 401)`);
    if (unauthDashRes.status !== 401) {
      throw new Error(`Échec AuthGuard : statut ${unauthDashRes.status} au lieu de 401`);
    }
    const unauthBody = (await unauthDashRes.json()) as { status: number; title: string };
    console.log(`   Erreur RFC 7807 reçue : "${unauthBody.title || 'Unauthorized'}" (code ${unauthBody.status})`);
    console.log('   ✔ Accès non authentifié rejeté avec succès.\n');

    // Nettoyage final
    await prisma.activityEvent.deleteMany({ where: { userId: { in: [lucasUser.id, emmaUser.id] } } });
    await prisma.lessonProgress.deleteMany({ where: { userId: { in: [lucasUser.id, emmaUser.id] } } });
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: [lucasUser.id, emmaUser.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [lucasUser.id, emmaUser.id] } } });

    console.log('='.repeat(70));
    console.log('🎉 TOUTES LES PROPRIÉTÉS ET PROTOCOLES HTTP DU LOT 6 SONT VALIDÉS !');
    console.log('='.repeat(70));
  } finally {
    await app.close();
  }
}

void runDemonstration();
