import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

async function runDemonstration() {
  console.log('======================================================');
  console.log('    Démonstration de bout en bout — Lot 4 (OpenSIO)    ');
  console.log('======================================================\n');

  process.env.API_PORT = '4005';
  process.env.JWT_SECRET = 'c'.repeat(64);
  process.env.REGISTRATION_ENABLED = 'true';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.listen(4005);

  const baseUrl = 'http://localhost:4005/api/v1';

  try {
    // Étape 1 : Tentative d'accès non authentifié au catalogue
    console.log('1. [Sécurité] Tentative d\'accès non authentifié à GET /tracks...');
    const unauthRes = await fetch(`${baseUrl}/tracks`);
    console.log(`   Statut : ${unauthRes.status} (attendu: 401)`);
    const unauthBody = (await unauthRes.json()) as { type: string; detail: string };
    console.log(`   RFC 7807 : type="${unauthBody.type}", detail="${unauthBody.detail}"`);
    if (unauthRes.status !== 401) {
      throw new Error('Échec de la protection AuthGuard');
    }
    console.log('   ✔ Accès non authentifié correctement rejeté avec redirection requise.\n');

    // Étape 2 : Connexion de l'étudiant du seed
    console.log('2. [Auth] Connexion avec le compte étudiant student@opensio.local...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@opensio.local',
        password: 'StudentOpenSIO2026!',
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Échec de connexion : ${loginRes.status}`);
    }

    const loginData = (await loginRes.json()) as { accessToken: string; user: { displayName: string; role: string } };
    const token = loginData.accessToken;
    console.log(`   ✔ Connecté avec succès : ${loginData.user.displayName} (${loginData.user.role})`);
    console.log(`   Jeton JWT Bearer reçu (en mémoire, D-09) : ${token.substring(0, 25)}...\n`);

    // Étape 3 : Consultation des années (tracks)
    console.log('3. [Catalogue] Consultation de GET /tracks...');
    const tracksRes = await fetch(`${baseUrl}/tracks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tracks = (await tracksRes.json()) as Array<{ slug: string; title: string; modulesCount: number; progress?: null }>;
    console.log(`   ✔ ${tracks.length} année(s) récupérée(s) :`);
    tracks.forEach((t) => {
      console.log(`     - [${t.slug}] ${t.title} (${t.modulesCount} module(s), progress: ${t.progress ?? 'null — réservé Lot 6'})`);
    });
    console.log('');

    // Étape 4 : Consultation des modules d'une année
    console.log('4. [Catalogue] Consultation de GET /tracks/annee-1/modules...');
    const modulesRes = await fetch(`${baseUrl}/tracks/annee-1/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const modules = (await modulesRes.json()) as Array<{ slug: string; title: string; difficulty: number; estimatedMinutes: number; competencyRefs: string[] }>;
    console.log(`   ✔ ${modules.length} module(s) récupéré(s) :`);
    modules.forEach((m) => {
      console.log(`     - [${m.slug}] ${m.title} (Difficulté ${m.difficulty}/5, Durée: ${m.estimatedMinutes} min, Compétences: ${m.competencyRefs.join(', ')})`);
    });
    console.log('');

    // Étape 5 : Consultation du détail d'un module
    console.log('5. [Catalogue] Consultation de GET /modules/reseaux-fondamentaux...');
    const modRes = await fetch(`${baseUrl}/modules/reseaux-fondamentaux`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const modDetail = (await modRes.json()) as {
      title: string;
      lessons: Array<{ title: string }>;
      quizzes: Array<{ title: string; questionsCount: number }>;
      labs: Array<{ title: string; level: string }>;
    };
    console.log(`   ✔ Module "${modDetail.title}" :`);
    console.log(`     • ${modDetail.lessons.length} Leçon(s) : ${modDetail.lessons.map((l) => l.title).join(', ')}`);
    console.log(`     • ${modDetail.quizzes.length} Quiz : ${modDetail.quizzes.map((q) => `${q.title} (${q.questionsCount} questions)`).join(', ')}`);
    console.log(`     • ${modDetail.labs.length} Lab(s) : ${modDetail.labs.map((l) => `${l.title} [${l.level}]`).join(', ')}`);
    console.log('');

    // Étape 6 : Consultation d'une leçon et lecture sécurisée Markdown
    console.log('6. [Leçon] Consultation de GET /lessons/adressage-ipv4...');
    const lessonRes = await fetch(`${baseUrl}/lessons/adressage-ipv4`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const lessonDetail = (await lessonRes.json()) as {
      title: string;
      difficulty: number;
      estimatedMinutes: number;
      objectives: string[];
      content: string;
    };
    console.log(`   ✔ Leçon "${lessonDetail.title}" :`);
    console.log(`     • Difficulté : ${lessonDetail.difficulty}/5, Durée estimée : ${lessonDetail.estimatedMinutes} min`);
    console.log(`     • Objectifs : ${lessonDetail.objectives.length} objectif(s) défini(s)`);
    console.log(`     • Extrait Markdown sécurisé lu sur disque :`);
    console.log('------------------------------------------------------');
    console.log(lessonDetail.content.substring(0, 240) + '...\n');
    console.log('------------------------------------------------------');

    console.log('\n🎉 TOUTES LES ÉTAPES DU LOT 4 SONT DÉMONTRÉES AVEC SUCCÈS !');
    console.log('======================================================\n');
  } finally {
    await app.close();
  }
}

void runDemonstration();
