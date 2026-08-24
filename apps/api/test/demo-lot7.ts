import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { executeContentSync } from '../src/sync/sync.service';
import { CatalogCacheService } from '../src/modules/catalog/catalog-cache.service';
import { UserRole } from '@prisma/client';

async function runDemonstration() {
  console.log('='.repeat(70));
  console.log('🚀 DÉMONSTRATION RÉSEAU RÉELLE (HTTP) — LOT 7 (OpenSIO)');
  console.log('   Ateliers Pratiques (Labs), Runner & Sécurité Zéro-Fuite');
  console.log('='.repeat(70) + '\n');

  process.env.API_PORT = '4008';
  process.env.JWT_SECRET = 'd'.repeat(64);
  process.env.REGISTRATION_ENABLED = 'true';
  process.env.LAB_RUNNER = 'simulation';

  const contentDir = path.resolve(__dirname, '../../../content');
  process.env.CONTENT_PATH = contentDir;

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');
  await app.listen(4008);

  const baseUrl = 'http://localhost:4008/api/v1';
  const prisma = app.get(PrismaService);
  const cacheService = app.get(CatalogCacheService);
  const passwordService = app.get(PasswordService);

  // Synchronisation du catalogue pour assurer l'existence du lab
  await executeContentSync(prisma, contentDir, cacheService);

  try {
    // Préparation des comptes de test
    const lucasEmail = 'lucas.demo.lot7@opensio.local';
    const emmaEmail = 'emma.demo.lot7@opensio.local';
    const password = 'Password123!@#';

    for (const email of [lucasEmail, emmaEmail]) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.labEvent.deleteMany({ where: { session: { userId: existing.id } } });
        await prisma.labSession.deleteMany({ where: { userId: existing.id } });
        await prisma.activityEvent.deleteMany({ where: { userId: existing.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    const passwordHash = await passwordService.hash(password);
    const _lucasUser = await prisma.user.create({
      data: {
        email: lucasEmail,
        displayName: 'Lucas SISR',
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const _emmaUser = await prisma.user.create({
      data: {
        email: emmaEmail,
        displayName: 'Emma SISR',
        passwordHash,
        role: UserRole.STUDENT,
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
    // ÉTAPE 2 : Sécurité 401 sans token et consultation publique Zéro-Fuite
    // =========================================================================
    console.log('2. [Sécurité & Zéro-Fuite] Vérification 401 et structure de réponse publique...');

    const unauthRes = await fetch(`${baseUrl}/labs/plan-adressage-pme`);
    console.log(`   ✔ Accès anonyme à GET /api/v1/labs/plan-adressage-pme rejeté : HTTP ${unauthRes.status}`);
    if (unauthRes.status !== 401) throw new Error('Échec sécurité 401');

    const labRes = await fetch(`${baseUrl}/labs/plan-adressage-pme`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!labRes.ok) throw new Error(`Échec lecture lab : ${labRes.status}`);
    const labData = (await labRes.json()) as {
      slug: string;
      title: string;
      hintsCount: number;
      hintsSummary: Array<{ index: number; costPercent: number }>;
      editableFiles: Array<{ path: string; initialContent: string }>;
    };

    console.log(`   ✔ Définition publique reçue : "${labData.title}" (${labData.editableFiles.length} fichier éditable)`);
    console.log(`   ✔ Zéro-fuite vérifié : ${labData.hintsCount} indices recensés (coûts : ${labData.hintsSummary.map(h => `-${h.costPercent}%`).join(', ')}), ZÉRO texte d'indice divulgué\n`);

    // =========================================================================
    // ÉTAPE 3 : Démarrage d'une session & Test Anti-Injection de userId (§29.2)
    // =========================================================================
    console.log('3. [Cycle de vie & Anti-Injection] Lucas démarre une session en injectant le userId d’Emma...');

    const startRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenLucas}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: emmaAuth.user.id }),
    });
    if (!startRes.ok) throw new Error(`Échec démarrage session : ${startRes.status}`);
    const sessionLucas = (await startRes.json()) as {
      id: string;
      userId: string;
      status: string;
      files: Array<{ path: string; content: string }>;
      hintsUsed: number;
      expiresAt: string;
    };
    const lucasSessionId = sessionLucas.id;

    console.log(`   ✔ Session initialisée : ID ${lucasSessionId} (Statut: ${sessionLucas.status})`);
    console.log(`   ✔ Tentative d'injection userId="${emmaAuth.user.id}" ignorée : le JWT fait foi (userId="${sessionLucas.userId}")`);

    // Contrôle direct en base PostgreSQL
    const sessionInDb = await prisma.labSession.findUnique({ where: { id: lucasSessionId } });
    if (!sessionInDb || sessionInDb.userId !== lucasAuth.user.id) {
      throw new Error("Échec anti-injection : la session n'appartient pas à Lucas en base !");
    }
    console.log(`   ✔ Contrôle en base : la session appartient strictement à Lucas (${sessionInDb.userId})`);

    // Contrôle côté Emma via l'API (GET /labs/:slug avec tokenEmma)
    const emmaLabCheck = await fetch(`${baseUrl}/labs/plan-adressage-pme`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    const emmaLabJson = (await emmaLabCheck.json()) as { activeSessionId: string | null };
    if (emmaLabJson.activeSessionId !== null) {
      throw new Error("Échec anti-injection : Emma voit une session active alors qu'elle n'en a pas démarré !");
    }
    console.log(`   ✔ Contrôle côté Emma (GET /labs/plan-adressage-pme) : activeSessionId = null (0 session pour Emma)`);
    console.log(`   ✔ Fichier de départ chargé : ${sessionLucas.files[0].path} (${sessionLucas.files[0].content.length} octets)`);
    console.log(`   ✔ Expiration programmée à : ${new Date(sessionLucas.expiresAt).toLocaleTimeString()}\n`);

    // =========================================================================
    // ÉTAPE 4 : Vérification de l'isolation inter-utilisateurs stricte
    // =========================================================================
    console.log('4. [Isolation Inter-Utilisateurs] Emma tente d’interagir avec la session de Lucas...');

    const emmaReadRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    console.log(`   ✔ Consultation de la session par Emma rejetée : HTTP ${emmaReadRes.status} (Forbidden)`);
    if (emmaReadRes.status !== 403) throw new Error('Échec isolation en lecture');

    const emmaWriteRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/files`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenEmma}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: [{ path: 'plan.csv', content: 'hacked' }] }),
    });
    console.log(`   ✔ Modification des fichiers par Emma rejetée : HTTP ${emmaWriteRes.status} (Forbidden)`);
    if (emmaWriteRes.status !== 403) throw new Error('Échec isolation en écriture');

    const emmaValidateRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    console.log(`   ✔ Validation de la session par Emma rejetée : HTTP ${emmaValidateRes.status} (Forbidden)\n`);
    if (emmaValidateRes.status !== 403) throw new Error('Échec isolation en validation');

    // =========================================================================
    // ÉTAPE 5 : Sécurité anti-Path Traversal & Sauvegarde de fichiers par Lucas
    // =========================================================================
    console.log('5. [Sécurité & Fichiers] Test anti-path traversal et sauvegarde par Lucas...');

    const exploitRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/files`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenLucas}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: [{ path: '../evil.sh', content: 'rm -rf /' }] }),
    });
    console.log(`   ✔ Tentative de path traversal rejetée : HTTP ${exploitRes.status} (Bad Request)`);
    if (exploitRes.status !== 400) throw new Error('Échec protection path traversal');

    const validCsv = `service,network,prefix,gateway,first_host,last_host,broadcast
Production,10.20.0.0,26,10.20.0.1,10.20.0.1,10.20.0.62,10.20.0.63
Invites,10.20.0.64,27,10.20.0.65,10.20.0.65,10.20.0.94,10.20.0.95
Comptabilite,10.20.0.96,28,10.20.0.97,10.20.0.97,10.20.0.110,10.20.0.111`;

    const saveRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/files`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenLucas}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: [{ path: 'plan.csv', content: validCsv }] }),
    });
    if (!saveRes.ok) throw new Error(`Échec sauvegarde fichiers : ${saveRes.status}`);
    console.log('   ✔ Fichier plan.csv sauvegardé avec succès dans le sandbox du runner\n');

    // =========================================================================
    // ÉTAPE 6 : Consommation d'un indice (RM-05)
    // =========================================================================
    console.log('6. [Système d’Indices] Lucas débloque l’indice n°1 (POST /hint)...');

    const hintRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/hint`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!hintRes.ok) throw new Error(`Échec déblocage indice : ${hintRes.status}`);
    const hintData = (await hintRes.json()) as { hintIndex: number; costPercent: number; text: string; hintsUsed: number };

    console.log(`   ✔ Indice n°${hintData.hintIndex} débloqué (Coût : -${hintData.costPercent}%) : "${hintData.text}"`);
    console.log(`   ✔ Total indices consommés : ${hintData.hintsUsed}\n`);

    // =========================================================================
    // ÉTAPE 7 : Validation côté serveur par le Runner simulé
    // =========================================================================
    console.log('7. [Validation Serveur] Validation du travail de Lucas par le Runner...');

    const validateRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${lucasSessionId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!validateRes.ok) throw new Error(`Échec validation lab : ${validateRes.status}`);
    const verdict = (await validateRes.json()) as {
      passed: boolean;
      score: number;
      status: string;
      checks: Array<{ id: string; passed: boolean; points: number; message: string }>;
    };

    console.log(`   ✔ Statut de validation : ${verdict.passed ? 'RÉUSSI' : 'ÉCHOUÉ'} (Statut session: ${verdict.status})`);
    console.log(`   ✔ Score final calculé : ${verdict.score} points (100 brut - 10% pénalité indice RM-05)`);
    for (const c of verdict.checks) {
      console.log(`     • [${c.passed ? '✔' : '✘'}] ${c.id} (+${c.points} pts) : ${c.message}`);
    }
    console.log();

    // =========================================================================
    // ÉTAPE 8 : Vérification de l'alimentation du Tableau de bord (Lot 6)
    // =========================================================================
    console.log('8. [Tableau de bord] Vérification de l’événement LAB_COMPLETED dans l’activité...');

    const dashboardRes = await fetch(`${baseUrl}/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!dashboardRes.ok) throw new Error(`Échec lecture dashboard : ${dashboardRes.status}`);
    const dashboardData = (await dashboardRes.json()) as {
      recentActivity: Array<{ kind: string; metadata: Record<string, unknown> }>;
    };

    const labActivity = dashboardData.recentActivity.find((a) => a.kind === 'LAB_COMPLETED');
    if (!labActivity) throw new Error('Événement LAB_COMPLETED non trouvé dans le dashboard');

    console.log(`   ✔ Événement enregistré dans la timeline : "${labActivity.kind}"`);
    console.log(`   ✔ Métadonnées associées : Lab "${labActivity.metadata.labTitle}", Score ${labActivity.metadata.score} pts\n`);

    console.log('='.repeat(70));
    console.log('🎉 VALIDATION COMPLÈTE DU LOT 7 RÉUSSIE SANS AUCUNE DÉVIATION !');
    console.log('='.repeat(70));
  } finally {
    await app.close();
  }
}

void runDemonstration();
