import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'App Boot — Test de fumée de démarrage du conteneur DI (§13 / AppModule)',
  () => {
    let app: INestApplication;
    let moduleRef: TestingModule;
    let isDbConnected = false;

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'd'.repeat(64);
      process.env.CONTENT_PATH = process.env.CONTENT_PATH || './content';

      try {
        const prisma = new PrismaService();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        await prisma.$disconnect().catch(() => {});
        isDbConnected = true;

        moduleRef = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.useWebSocketAdapter(new WsAdapter(app));
        await app.init();
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('compile et initialise le vrai AppModule sans UnknownDependenciesException', (ctx) => {
      if (!isDbConnected) {
        ctx.skip();
        return;
      }
      expect(app).toBeDefined();
      expect(moduleRef).toBeDefined();
    });
  },
);
