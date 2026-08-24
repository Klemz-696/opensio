import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from '../src/app.module';

describe.skipIf(!process.env.DATABASE_URL)(
  'App Boot — Test de fumée de démarrage du conteneur DI (§13 / AppModule)',
  () => {
    let app: INestApplication;
    let moduleRef: TestingModule;

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'd'.repeat(64);
      process.env.CONTENT_PATH = process.env.CONTENT_PATH || './content';

      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.useWebSocketAdapter(new WsAdapter(app));
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('compile et initialise le vrai AppModule sans UnknownDependenciesException', () => {
      expect(app).toBeDefined();
      expect(moduleRef).toBeDefined();
    });
  },
);
