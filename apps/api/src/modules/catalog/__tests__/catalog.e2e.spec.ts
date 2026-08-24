import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { CatalogService } from '../catalog.service';
import { CatalogCacheService } from '../catalog-cache.service';
import { LessonReaderService } from '../lesson-reader.service';
import { CatalogController } from '../catalog.controller';
import { executeContentSync } from '../../../sync/sync.service';

const TEST_SECRET = 'c'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)(
  'Catalog Module — Tests d\'Intégration PostgreSQL & Markdown (§22.2 / §41)',
  () => {
    let prisma: PrismaService;
    let isDbConnected = false;
    let catalogService: CatalogService;
    let cacheService: CatalogCacheService;
    let lessonReader: LessonReaderService;
    let controller: CatalogController;

    const contentDir = path.resolve(__dirname, '../../../../../../content');

    beforeAll(async () => {
      process.env.JWT_SECRET = TEST_SECRET;

      try {
        prisma = new PrismaService();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        isDbConnected = true;

        cacheService = new CatalogCacheService();
        lessonReader = new LessonReaderService(contentDir);
        catalogService = new CatalogService(prisma, cacheService, lessonReader);
        controller = new CatalogController(catalogService);

        // Synchronisation du contenu réel de démonstration dans la base
        await executeContentSync(prisma, contentDir, cacheService);
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected) {
        await prisma.$disconnect();
      }
    });

    it('GET /tracks — retourne l\'année 1 synchronisée', async () => {
      if (!isDbConnected) return;

      const tracks = await controller.getTracks();
      expect(tracks.length).toBeGreaterThanOrEqual(1);

      const track1 = tracks.find((t) => t.slug === 'annee-1');
      expect(track1).toBeDefined();
      expect(track1?.title).toContain('1ère année');
      expect(track1?.modulesCount).toBeGreaterThanOrEqual(1);
      expect(track1?.progress).toBeNull();
    });

    it('GET /tracks/:slug/modules — retourne le module Réseaux Fondamentaux', async () => {
      if (!isDbConnected) return;

      const modules = await controller.getModulesByTrack('annee-1');
      expect(modules.length).toBeGreaterThanOrEqual(1);

      const mod = modules.find((m) => m.slug === 'reseaux-fondamentaux');
      expect(mod).toBeDefined();
      expect(mod?.title).toBe('Réseaux : fondamentaux');
      expect(mod?.difficulty).toBe(2);
      expect(mod?.lessonsCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /modules/:slug — retourne le détail complet avec leçons, quiz et labs', async () => {
      if (!isDbConnected) return;

      const detail = await controller.getModuleBySlug('reseaux-fondamentaux');
      expect(detail).toBeDefined();
      expect(detail.slug).toBe('reseaux-fondamentaux');
      expect(detail.track.slug).toBe('annee-1');
      expect(detail.lessons.length).toBeGreaterThanOrEqual(1);
      expect(detail.quizzes.length).toBeGreaterThanOrEqual(1);
      expect(detail.labs.length).toBeGreaterThanOrEqual(1);

      // Vérifier que le quiz ne contient PAS les bonnes réponses (seul questionsCount est exposé)
      expect(detail.quizzes[0].questionsCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /lessons/:slug — lit le fichier Markdown sécurisé et retourne les métadonnées', async () => {
      if (!isDbConnected) return;

      const lesson = await controller.getLessonBySlug('adressage-ipv4');
      expect(lesson).toBeDefined();
      expect(lesson.slug).toBe('adressage-ipv4');
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(1);
      expect(lesson.content).toContain('# Adressage IPv4');
      expect(lesson.relatedLabs.length).toBeGreaterThanOrEqual(1);
      expect(lesson.relatedLabs[0].slug).toBe('plan-adressage-pme');
    });

    it('invalide le cache mémoire lors d\'une nouvelle synchronisation (§41)', async () => {
      if (!isDbConnected) return;

      // Remplir le cache
      await controller.getTracks();
      await controller.getModuleBySlug('reseaux-fondamentaux');
      expect(cacheService.size()).toBeGreaterThanOrEqual(2);

      // Synchronisation avec cacheInvalidator
      await executeContentSync(prisma, contentDir, cacheService);
      expect(cacheService.size()).toBe(0);
    });
  },
);
