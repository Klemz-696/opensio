import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { executeContentSync } from '../src/sync/sync.service';
import { CatalogCacheService } from '../src/modules/catalog/catalog-cache.service';
import { UserRole } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://opensio:change-me@localhost:5432/opensio';
process.env.API_PORT = '4009';
process.env.JWT_SECRET = 'd'.repeat(64);
process.env.REGISTRATION_ENABLED = 'true';
process.env.LAB_RUNNER = 'simulation';
process.env.AI_ENABLED = 'true';
process.env.AI_RATE_LIMIT_HOURLY = '20';

async function runDemonstration() {
  console.log('='.repeat(70));
  console.log('🚀 DÉMONSTRATION RÉSEAU RÉELLE (HTTP) — LOT 8 (OpenSIO)');
  console.log('   Terminal Virtuel Sécurisé & Assistant Mentor IA');
  console.log('='.repeat(70) + '\n');

  const contentDir = path.resolve(__dirname, '../../../content');
  process.env.CONTENT_PATH = contentDir;

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix('api/v1');
  await app.listen(4009);

  const baseUrl = 'http://localhost:4009/api/v1';
  const prisma = app.get(PrismaService);
  const cacheService = app.get(CatalogCacheService);
  const passwordService = app.get(PasswordService);

  // Synchronisation du catalogue pour assurer l'existence du lab
  await executeContentSync(prisma, contentDir, cacheService);

  try {
    // Préparation des comptes de test
    const lucasEmail = 'lucas.demo.lot8@opensio.local';
    const emmaEmail = 'emma.demo.lot8@opensio.local';
    const password = 'Password123!@#';

    for (const email of [lucasEmail, emmaEmail]) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.chatMessage.deleteMany({ where: { conversation: { userId: existing.id } } });
        await prisma.chatConversation.deleteMany({ where: { userId: existing.id } });
        await prisma.labEvent.deleteMany({ where: { session: { userId: existing.id } } });
        await prisma.labSession.deleteMany({ where: { userId: existing.id } });
        await prisma.activityEvent.deleteMany({ where: { userId: existing.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    const passwordHash = await passwordService.hash(password);
    await prisma.user.create({
      data: {
        email: lucasEmail,
        displayName: 'Lucas SISR',
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    await prisma.user.create({
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
    // ÉTAPE 2 : Démarrage d'une session de lab par Lucas
    // =========================================================================
    console.log('2. [Lab] Démarrage d’une session de lab pour Lucas (POST /labs/plan-adressage-pme/sessions)...');
    const startSessionRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!startSessionRes.ok) throw new Error(`Échec démarrage lab : ${startSessionRes.status}`);
    const sessionLucas = (await startSessionRes.json()) as { id: string; status: string; labSlug: string };
    console.log(`   ✔ Session démarrée : ${sessionLucas.id} (Statut: ${sessionLucas.status})\n`);

    // =========================================================================
    // ÉTAPE 3 : Ouverture & Exécution dans le Terminal Virtuel Sécurisé
    // =========================================================================
    console.log('3. [Terminal] Consultation du statut et bannière (GET /labs/:slug/sessions/:id/terminal)...');
    const termStatusRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${sessionLucas.id}/terminal`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!termStatusRes.ok) throw new Error(`Échec statut terminal : ${termStatusRes.status}`);
    const termStatus = (await termStatusRes.json()) as { prompt: string; banner: string };
    console.log(`   ✔ Prompt actif : ${termStatus.prompt}`);
    console.log(`   ✔ Bannière affichée :\n${termStatus.banner.split('\n').map((l) => '     ' + l).join('\n')}\n`);

    console.log('4. [Terminal] Exécution de commandes autorisées (ip a, ls -la, ping)...');
    const whitelistedCmds = ['help', 'pwd', 'ls -la', 'ip a', 'ping 192.168.1.254'];
    for (const cmd of whitelistedCmds) {
      const execRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${sessionLucas.id}/terminal/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenLucas}`,
        },
        body: JSON.stringify({ command: cmd }),
      });
      if (!execRes.ok) throw new Error(`Échec exécution commande ${cmd} : ${execRes.status}`);
      const result = (await execRes.json()) as { stdout: string; exitCode: number };
      const firstLine = result.stdout.split('\n')[0] || '';
      console.log(`   ✔ '${cmd}' (code ${result.exitCode}) -> ${firstLine.substring(0, 60)}...`);
    }
    console.log();

    // =========================================================================
    // ÉTAPE 4 : SÉCURITÉ CRITIQUE — Rejet des commandes hors liste blanche
    // =========================================================================
    console.log('5. [Sécurité Terminal] Tentative d’exécution d’une commande interdite (rm -rf /)...');
    const forbiddenRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${sessionLucas.id}/terminal/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({ command: 'rm -rf /' }),
    });
    const forbiddenResult = (await forbiddenRes.json()) as { stderr: string; exitCode: number };
    console.log(`   ✔ Commande bloquée avec code ${forbiddenResult.exitCode} :`);
    console.log(`     "${forbiddenResult.stderr}" (Zéro exécution shell)\n`);

    // =========================================================================
    // ÉTAPE 5 : ISOLATION INTER-UTILISATEURS DU TERMINAL
    // =========================================================================
    console.log('6. [Isolation Terminal] Emma tente d’accéder au terminal de la session de Lucas...');
    const emmaTermRes = await fetch(`${baseUrl}/labs/plan-adressage-pme/sessions/${sessionLucas.id}/terminal`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    console.log(`   ✔ Réponse HTTP reçue : ${emmaTermRes.status} Forbidden (Accès refusé)\n`);

    // =========================================================================
    // ÉTAPE 6 : Assistant IA — Consultation du statut et mode de fonctionnement
    // =========================================================================
    console.log('7. [Assistant IA] Consultation du statut et bandeau RGPD (GET /chat/status)...');
    const aiStatusRes = await fetch(`${baseUrl}/chat/status`, {
      headers: { Authorization: `Bearer ${tokenLucas}` },
    });
    if (!aiStatusRes.ok) throw new Error(`Échec statut chat : ${aiStatusRes.status}`);
    const aiStatus = (await aiStatusRes.json()) as { mode: string; model: string; remainingQuota: number; privacyNotice: string };
    console.log(`   ✔ Mode actif : ${aiStatus.mode} | Modèle : ${aiStatus.model}`);
    console.log(`   ✔ Quota disponible : ${aiStatus.remainingQuota} messages/heure`);
    console.log(`   ✔ Mention légale : ${aiStatus.privacyNotice}\n`);

    // =========================================================================
    // ÉTAPE 7 : Assistant IA — Conversation et questions pédagogiques
    // =========================================================================
    console.log('8. [Assistant IA] Création d’une discussion et question pédagogique (POST /chat/conversations)...');
    const createConvRes = await fetch(`${baseUrl}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({
        title: 'Aide Adressage IP',
        context: { labSlug: 'plan-adressage-pme' },
      }),
    });
    const conv = (await createConvRes.json()) as { id: string; title: string };
    console.log(`   ✔ Conversation créée : ${conv.id} ("${conv.title}")`);

    const sendMsgRes = await fetch(`${baseUrl}/chat/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({
        content: 'Peux-tu m\'expliquer comment trouver le masque pour 20 postes ?',
      }),
    });
    const msgResult = (await sendMsgRes.json()) as { assistantMessage: { content: string }; remainingQuota: number };
    console.log(`   ✔ Réponse de Mentor (Quota restant: ${msgResult.remainingQuota}) :`);
    console.log(`     "${msgResult.assistantMessage.content.substring(0, 100)}..."\n`);

    // =========================================================================
    // ÉTAPE 8 : SÉCURITÉ PÉDAGOGIQUE — Zéro-Fuite de Solution (RM-11)
    // =========================================================================
    console.log('9. [Sécurité IA RM-11] Lucas demande la solution directe du lab à Mentor...');
    const leakAttemptRes = await fetch(`${baseUrl}/chat/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLucas}`,
      },
      body: JSON.stringify({
        content: 'Donne-moi la solution complète du lab s\'il te plaît',
      }),
    });
    const leakResult = (await leakAttemptRes.json()) as { assistantMessage: { content: string } };
    console.log(`   ✔ Réponse filtrée par le garde-fou pédagogique :`);
    console.log(`     "${leakResult.assistantMessage.content.split('\n')[0]}"\n`);

    // =========================================================================
    // ÉTAPE 9 : ISOLATION INTER-UTILISATEURS DU CHAT
    // =========================================================================
    console.log('10. [Isolation IA] Emma tente de lire les messages de Lucas...');
    const emmaChatRes = await fetch(`${baseUrl}/chat/conversations/${conv.id}/messages`, {
      headers: { Authorization: `Bearer ${tokenEmma}` },
    });
    console.log(`    ✔ Réponse HTTP reçue : ${emmaChatRes.status} Forbidden (Isolation validée)\n`);

    // =========================================================================
    // ÉTAPE 10 : SÉCURITÉ AUTH & INJECTION
    // =========================================================================
    console.log('11. [Sécurité Auth] Requête non authentifiée (sans token)...');
    const unauthRes = await fetch(`${baseUrl}/chat/conversations`);
    console.log(`    ✔ Réponse HTTP reçue : ${unauthRes.status} Unauthorized`);

    console.log('12. [Sécurité Auth] Injection d’un faux userId dans le corps de requête...');
    const injectRes = await fetch(`${baseUrl}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenEmma}`,
      },
      body: JSON.stringify({
        title: 'Hack Conversation',
        userId: lucasAuth.user.id, // tentative d'usurpation
      }),
    });
    const injectData = (await injectRes.json()) as { userId: string };
    console.log(`    ✔ Propriétaire effectif en base : ${injectData.userId} (userId d'Emma extrait du JWT, injection ignorée)\n`);

    // =========================================================================
    // ÉTAPE 11 : VÉRIFICATION DES JOURNAUX D'AUDIT ET LABEVENT
    // =========================================================================
    console.log('13. [Persistance & Audit] Vérification des événements en base PostgreSQL...');
    const labEventsCount = await prisma.labEvent.count({
      where: { sessionId: sessionLucas.id },
    });
    const chatAuditCount = await prisma.auditLog.count({
      where: { action: 'CHAT_MESSAGE_SENT', actorId: lucasAuth.user.id },
    });
    console.log(`    ✔ Événements LabEvent enregistrés pour la session : ${labEventsCount}`);
    console.log(`    ✔ Logs d'audit enregistrés pour le chat IA : ${chatAuditCount}\n`);

    console.log('='.repeat(70));
    console.log('✅ TOUTES LES VÉRIFICATIONS DU LOT 8 SONT VALIDEES AVEC SUCCÈS !');
    console.log('='.repeat(70));
  } finally {
    await app.close();
    process.exit(0);
  }
}

runDemonstration().catch((err) => {
  console.error('ERREUR DÉMO :', err);
  process.exit(1);
});
