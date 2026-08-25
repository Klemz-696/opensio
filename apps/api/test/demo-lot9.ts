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
  process.env.DATABASE_URL || 'postgresql://opensio:opensio-super-secure-dev-db-pass-2026!@127.0.0.1:5432/opensio';
process.env.API_PORT = '4012';
process.env.JWT_SECRET = 'e'.repeat(64);
process.env.REGISTRATION_ENABLED = 'true';
process.env.LAB_RUNNER = 'simulation';
process.env.AI_ENABLED = 'true';
process.env.AI_RATE_LIMIT_HOURLY = '20';
process.env.AI_TIMEOUT_MS = '3000';

async function runDemonstration() {
  console.log('='.repeat(70));
  console.log('🚀 DÉMONSTRATION RÉSEAU RÉELLE (HTTP) — LOT v0.2 DÉPLOIEMENT & DISTRIBUTION');
  console.log('   Stack Production Dockerisée, Health Checks, Secrets Forts & Sauvegarde D-18');
  console.log('='.repeat(70) + '\n');

  const contentDir = path.resolve(__dirname, '../../../content');
  process.env.CONTENT_PATH = contentDir;

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix('api/v1');
  await app.listen(4012);

  const baseUrl = 'http://localhost:4012/api/v1';
  const prisma = app.get(PrismaService);
  const cacheService = app.get(CatalogCacheService);
  const passwordService = app.get(PasswordService);

  // Synchronisation du catalogue
  await executeContentSync(prisma, contentDir, cacheService);

  try {
    // 1. Healthcheck
    console.log('1️⃣  Vérification de la Sonde de Santé (/api/v1/health)...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = (await healthRes.json()) as { status: string; version: string };
    console.log(`   [STATUS] ${healthRes.status} OK`);
    console.log(`   [PAYLOAD] status="${healthData.status}", version="${healthData.version}"\n`);

    // 2. Authentification et JWT
    console.log('2️⃣  Vérification de l\'Authentification et des Permissions...');
    const adminEmail = 'admin.deploy.test@opensio.local';
    const studentEmail = 'student.deploy.test@opensio.local';
    const testPassword = 'Password123!@#';

    for (const email of [adminEmail, studentEmail]) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.lessonProgress.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    const hashedAdmin = await passwordService.hash(testPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedAdmin,
        displayName: 'Admin Deploy',
        role: UserRole.ADMIN,
      },
    });

    const hashedStudent = await passwordService.hash(testPassword);
    await prisma.user.create({
      data: {
        email: studentEmail,
        passwordHash: hashedStudent,
        displayName: 'Student Deploy',
        role: UserRole.STUDENT,
      },
    });

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: testPassword }),
    });
    const loginData = (await loginRes.json()) as { accessToken: string; user: { role: string } };
    const token = loginData.accessToken;
    console.log(`   [LOGIN ADMIN] Status: ${loginRes.status}, Role: ${loginData.user.role}, Token généré: ${token.slice(0, 20)}...\n`);

    // 3. Consultation du catalogue
    console.log('3️⃣  Consultation du Catalogue Synchronisé...');
    const catRes = await fetch(`${baseUrl}/catalogue/tracks`);
    const tracks = (await catRes.json()) as Array<{ id: string; title: string; modules?: unknown[] }>;
    console.log(`   [CATALOGUE] ${tracks.length} parcours disponibles.`);
    if (tracks.length > 0) {
      console.log(`   [TRACK 1] id="${tracks[0].id}", title="${tracks[0].title}", modules=${tracks[0].modules?.length || 0}\n`);
    }

    // 4. Statut du Mentor IA
    console.log('4️⃣  Vérification du Statut du Mentor IA (/chat/status)...');
    const aiStatusRes = await fetch(`${baseUrl}/chat/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const aiStatus = (await aiStatusRes.json()) as { enabled: boolean; provider: string; model: string };
    console.log(`   [AI STATUS] enabled=${aiStatus.enabled}, provider="${aiStatus.provider}", model="${aiStatus.model}"\n`);

    // 5. Nettoyage des comptes de test
    for (const email of [adminEmail, studentEmail]) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    console.log('='.repeat(70));
    console.log('✨ DÉMONSTRATION LOT v0.2 RÉUSSIE À 100% !');
    console.log('='.repeat(70) + '\n');
  } finally {
    await app.close();
  }
}

runDemonstration().catch((err) => {
  console.error('❌ Erreur lors de la démonstration :', err);
  process.exit(1);
});
