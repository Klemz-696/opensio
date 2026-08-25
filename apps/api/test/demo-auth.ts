/**
 * apps/api/test/demo-auth.ts
 * Démonstration manuelle du flux complet du Lot 3 — Authentification (OpenSIO)
 */

import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

process.env.NODE_ENV = 'development';
process.env.APP_URL = 'http://localhost:3000';
process.env.API_PORT = '4099';
process.env.JWT_SECRET = 'd'.repeat(64);
process.env.REGISTRATION_ENABLED = 'true';

const BASE_URL = 'http://localhost:4099/api/v1';

function logStep(stepNum: number, title: string) {
  console.log(`\n======================================================================`);
  console.log(`👉 Étape ${stepNum} : ${title}`);
  console.log(`======================================================================`);
}

function parseCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/refreshToken=([^;]+)/);
  return match ? match[1] : null;
}

async function runDemo() {
  console.log('🚀 Démarrage du serveur NestJS pour la démonstration...');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix('api/v1');
  await app.listen(4099);
  console.log('✅ Serveur de démonstration en écoute sur http://localhost:4099/api/v1\n');

  const demoEmail = `demo.etudiant.${Date.now()}@opensio.local`;
  const demoPassword = 'MonMotDePasseFort123!';

  try {
    // 1. Inscription
    logStep(1, "Inscription d'un nouvel étudiant (POST /auth/register)");
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: demoEmail,
        displayName: 'Étudiant Démo SISR',
        password: demoPassword,
      }),
    });
    const regData = await regRes.json();
    console.log(`Statut HTTP : ${regRes.status}`);
    console.log('Réponse :', JSON.stringify(regData, null, 2));

    // 2. Connexion
    logStep(2, 'Connexion (POST /auth/login)');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword,
      }),
    });
    const loginData = (await loginRes.json()) as { accessToken: string; user: unknown };
    const token1 = parseCookie(loginRes);
    console.log(`Statut HTTP : ${loginRes.status}`);
    console.log('Access Token (JWT HS256) :', loginData.accessToken.slice(0, 35) + '...');
    console.log('Refresh Token initial reçu (cookie) :', token1?.slice(0, 20) + '...');
    console.log('Profil utilisateur :', JSON.stringify(loginData.user, null, 2));

    // 3. Profil protégé /me
    logStep(3, 'Consultation du profil connecté (GET /auth/me) avec Bearer Token');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    const meData = await meRes.json();
    console.log(`Statut HTTP : ${meRes.status}`);
    console.log('Réponse /me :', JSON.stringify(meData, null, 2));

    // 4. Rotation légitime
    logStep(4, 'Rotation légitime du Refresh Token (POST /auth/refresh)');
    const refresh1Res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token1}` },
    });
    const refresh1Data = (await refresh1Res.json()) as { accessToken: string; user: unknown };
    const token2 = parseCookie(refresh1Res);
    console.log(`Statut HTTP : ${refresh1Res.status}`);
    console.log('Nouvel Access Token :', refresh1Data.accessToken.slice(0, 35) + '...');
    console.log('Nouveau Refresh Token reçu (token 2) :', token2?.slice(0, 20) + '...');

    // 5. Attaque / Réutilisation du Token 1
    logStep(5, "Tentative d'attaque : réutilisation de l'ancien Refresh Token 1");
    const reuseRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token1}` },
    });
    const reuseData = await reuseRes.json();
    console.log(`Statut HTTP : ${reuseRes.status} (Attendu : 401 Unauthorized)`);
    console.log('Détail du refus sécurité (RFC 7807) :', JSON.stringify(reuseData, null, 2));

    // 6. Vérification de la révocation en cascade
    logStep(6, 'Vérification : le Token 2 a été révoqué par la détection de violation');
    const cascadeRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token2}` },
    });
    const cascadeData = await cascadeRes.json();
    console.log(`Statut HTTP : ${cascadeRes.status} (Attendu : 401 Unauthorized)`);
    console.log('Détail du refus :', JSON.stringify(cascadeData, null, 2));

    // 7. Re-connexion et Logout
    logStep(7, 'Re-connexion légitime puis Déconnexion (POST /auth/logout)');
    const reLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword,
      }),
    });
    console.log(`Re-connexion réussie : HTTP ${reLoginRes.status}`);
    const token3 = parseCookie(reLoginRes);

    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token3}` },
    });
    const logoutData = await logoutRes.json();
    console.log(`Déconnexion : HTTP ${logoutRes.status}`);
    console.log('Set-Cookie retourné :', logoutRes.headers.get('set-cookie'));
    console.log('Réponse logout :', JSON.stringify(logoutData, null, 2));

    console.log('\n🎉 [SUCCÈS] Démonstration du flux d\'authentification complet terminée avec succès !');
  } finally {
    await app.close();
  }
}

runDemo().catch((err) => {
  console.error('❌ Erreur lors de la démonstration :', err);
  process.exit(1);
});
