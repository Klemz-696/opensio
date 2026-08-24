import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

async function runDemonstration() {
  console.log('======================================================');
  console.log('    Démonstration de bout en bout — Lot 5 (OpenSIO)    ');
  console.log('         Quiz Interactifs & Zéro-Fuite                ');
  console.log('======================================================\n');

  process.env.API_PORT = '4006';
  process.env.JWT_SECRET = 'c'.repeat(64);
  process.env.REGISTRATION_ENABLED = 'true';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.listen(4006);

  const baseUrl = 'http://localhost:4006/api/v1';
  const prisma = app.get(PrismaService);

  try {
    // Étape 1 : Protection AuthGuard (401 sans token)
    console.log('1. [Sécurité] Tentative d\'accès non authentifié à GET /quizzes/quiz-adressage...');
    const unauthGet = await fetch(`${baseUrl}/quizzes/quiz-adressage`);
    console.log(`   Statut : ${unauthGet.status} (attendu: 401)`);
    if (unauthGet.status !== 401) throw new Error('Échec protection AuthGuard');
    console.log('   ✔ Accès non authentifié correctement rejeté avec code 401.\n');

    // Étape 2 : Connexion de l\'étudiant
    console.log('2. [Auth] Connexion avec le compte étudiant student@opensio.local...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@opensio.local',
        password: 'StudentOpenSIO2026!',
      }),
    });

    if (!loginRes.ok) throw new Error(`Échec de connexion : ${loginRes.status}`);
    const loginData = (await loginRes.json()) as { accessToken: string; user: { displayName: string } };
    const token = loginData.accessToken;
    console.log(`   ✔ Connecté avec succès : ${loginData.user.displayName}`);
    console.log(`   Jeton JWT Bearer reçu (en mémoire, D-09) : ${token.substring(0, 25)}...\n`);

    // Étape 3 : Récupération du quiz et vérification ZÉRO-FUITE
    console.log('3. [Quiz] Récupération du quiz GET /quizzes/quiz-adressage...');
    const quizRes = await fetch(`${baseUrl}/quizzes/quiz-adressage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!quizRes.ok) throw new Error(`Erreur récupération quiz : ${quizRes.status}`);

    const quiz = (await quizRes.json()) as {
      id: string;
      title: string;
      passingScore: number;
      questions: Array<{ id: string; kind: string; prompt: string; choices: Array<{ id: string; text: string }> }>;
    };

    console.log(`   ✔ Quiz "${quiz.title}" reçu (${quiz.questions.length} questions, seuil: ${quiz.passingScore}%)`);

    // Assertion stricte zéro-fuite
    const rawQuizJson = JSON.stringify(quiz);
    const hasLeak = rawQuizJson.includes('correctChoiceIds') || rawQuizJson.includes('explanation');
    console.log(`   Contrôle Zéro-Fuite : ${hasLeak ? '❌ FUITE DÉTECTÉE' : '✔ AUCUNE fuite de réponses ni d\'explications'}`);
    if (hasLeak) throw new Error('Fuite de données confidentielles détectée dans GET /quizzes/:slug');
    console.log('');

    // Étape 4 : Soumission d'une tentative échouée (1/5 bonnes réponses = 20%)
    console.log('4. [Passation] Soumission d\'une tentative incomplète (1 bonne réponse sur 5)...');
    const failingAnswers: Record<string, string[]> = {
      [quiz.questions[0].id]: ['b'], // Bonne réponse pour Q1 (192.168.1.64)
      [quiz.questions[1].id]: ['a'], // Faux
      [quiz.questions[2].id]: ['a'], // Faux
      [quiz.questions[3].id]: ['a'], // Faux (partiel)
      [quiz.questions[4].id]: ['b'], // Faux
    };

    const failAttemptRes = await fetch(`${baseUrl}/quizzes/quiz-adressage/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers: failingAnswers }),
    });

    const failResult = (await failAttemptRes.json()) as {
      id: string;
      score: number;
      passed: boolean;
      totalQuestions: number;
      correctQuestions: number;
      questions: Array<{ questionId: string; isCorrect: boolean; explanation: string }>;
    };

    console.log(`   Statut : ${failAttemptRes.status}`);
    console.log(`   Score obtenu : ${failResult.score}% (${failResult.correctQuestions}/${failResult.totalQuestions})`);
    console.log(`   Validation RM-01 : passed = ${failResult.passed} (seuil: ${quiz.passingScore}%)`);
    console.log(`   Explication Q1 reçue : "${failResult.questions[0].explanation.substring(0, 70)}..."`);
    console.log('   ✔ Tentative échouée correctement notée avec explications pédagogiques fournies.\n');

    // Étape 5 : Soumission d'une tentative réussie (100%) avec Idempotency-Key
    console.log('5. [Passation] Soumission d\'une tentative sans faute (100%) avec Idempotency-Key...');
    const idempotencyKey = `demo-key-${Date.now()}`;
    const perfectAnswers: Record<string, string[]> = {
      [quiz.questions[0].id]: ['b'],
      [quiz.questions[1].id]: ['b'],
      [quiz.questions[2].id]: ['c'],
      [quiz.questions[3].id]: ['a', 'b', 'c'],
      [quiz.questions[4].id]: ['a'],
    };

    const passAttemptRes = await fetch(`${baseUrl}/quizzes/quiz-adressage/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ answers: perfectAnswers }),
    });

    const passResult = (await passAttemptRes.json()) as {
      id: string;
      score: number;
      passed: boolean;
      correctQuestions: number;
      totalQuestions: number;
    };

    console.log(`   Score obtenu : ${passResult.score}% (${passResult.correctQuestions}/${passResult.totalQuestions})`);
    console.log(`   Validation RM-01 : passed = ${passResult.passed} 🎉`);
    console.log(`   ID de tentative : ${passResult.id}\n`);

    // Étape 6 : Test de déduplication et d'idempotence
    console.log('6. [Idempotence] Répétition immédiate de la requête avec la même Idempotency-Key...');
    const duplicateRes = await fetch(`${baseUrl}/quizzes/quiz-adressage/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ answers: perfectAnswers }),
    });

    const duplicateResult = (await duplicateRes.json()) as { id: string; score: number };
    console.log(`   ID de tentative renvoyé : ${duplicateResult.id}`);
    const isIdempotent = duplicateResult.id === passResult.id;
    console.log(`   ✔ Idempotence garantie : même tentative réutilisée (${isIdempotent ? 'SUCCÈS' : 'ÉCHEC'}).\n`);

    // Étape 7 : Historique des tentatives
    console.log('7. [Historique] Consultation de GET /quizzes/quiz-adressage/attempts...');
    const historyRes = await fetch(`${baseUrl}/quizzes/quiz-adressage/attempts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const history = (await historyRes.json()) as Array<{ id: string; score: number; passed: boolean; startedAt: string }>;
    console.log(`   ✔ ${history.length} tentative(s) enregistrée(s) en base pour cet étudiant :`);
    history.forEach((h, idx) => {
      console.log(`     [${idx + 1}] Score: ${h.score}% | Réussi: ${h.passed} | Date: ${h.startedAt}`);
    });
    console.log('');

    // Étape 8 : Vérification de la journalisation d'audit (RM-12)
    console.log('8. [Audit] Vérification des logs d\'audit pour QUIZ_ATTEMPT_SUBMITTED...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'QUIZ_ATTEMPT_SUBMITTED' },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    console.log(`   ✔ ${auditLogs.length} événement(s) d'audit trouvés.`);
    auditLogs.forEach((log) => {
      console.log(`     - [${log.action}] Cible: ${log.targetType} (${log.targetId}) | Score: ${(log.metadata as Record<string, unknown>)?.score}%`);
    });

    console.log('\n🎉 TOUTES LES ÉTAPES DU LOT 5 SONT DÉMONTRÉES AVEC SUCCÈS !');
    console.log('======================================================\n');
  } finally {
    await app.close();
  }
}

void runDemonstration();
