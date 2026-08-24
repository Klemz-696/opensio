import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog.service';
import { CatalogCacheService } from '../catalog-cache.service';
import { LessonReaderService } from '../lesson-reader.service';
import { CatalogProgressEnricherService } from '../catalog-progress-enricher.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let prismaMock: {
    track: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    module: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    lesson: { findUnique: ReturnType<typeof vi.fn> };
  };
  let cacheService: CatalogCacheService;
  let lessonReaderMock: { readLessonMarkdown: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prismaMock = {
      track: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      module: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      lesson: {
        findUnique: vi.fn(),
      },
    };

    cacheService = new CatalogCacheService();
    lessonReaderMock = {
      readLessonMarkdown: vi.fn().mockResolvedValue('# Contenu de test'),
    };

    const enricherMock = {
      enrichTracks: vi.fn().mockImplementation((tracks) => tracks),
      enrichModules: vi.fn().mockImplementation((modules) => modules),
      enrichModuleDetail: vi.fn().mockImplementation((detail) => detail),
      enrichLessonDetail: vi.fn().mockImplementation((detail) => detail),
    };

    service = new CatalogService(
      prismaMock as unknown as PrismaService,
      cacheService,
      lessonReaderMock as unknown as LessonReaderService,
      enricherMock as unknown as CatalogProgressEnricherService,
    );
  });

  describe('getTracks', () => {
    it('retourne la liste des années de formation et met en cache', async () => {
      const mockTracks = [
        {
          id: 'track-1',
          slug: 'annee-1',
          title: 'Première Année',
          description: 'Tronc commun',
          position: 1,
          _count: { modules: 5 },
        },
      ];

      prismaMock.track.findMany.mockResolvedValue(mockTracks);

      const result = await service.getTracks();
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('annee-1');
      expect(result[0].modulesCount).toBe(5);
      expect(result[0].progress).toBeNull();

      // Deuxième appel : doit provenir du cache (Prisma non rappelé)
      prismaMock.track.findMany.mockClear();
      const cachedResult = await service.getTracks();
      expect(cachedResult).toEqual(result);
      expect(prismaMock.track.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getModulesByTrack', () => {
    it('retourne les modules d\'une année existante', async () => {
      prismaMock.track.findUnique.mockResolvedValue({
        id: 'track-1',
        slug: 'annee-1',
      });

      prismaMock.module.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          slug: 'reseaux-fondamentaux',
          title: 'Réseaux fondamentaux',
          description: 'Bases réseau',
          position: 1,
          difficulty: 2,
          estimatedMinutes: 120,
          competencyRefs: ['B2.1'],
          _count: { lessons: 3 },
        },
      ]);

      const result = await service.getModulesByTrack('annee-1');
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('reseaux-fondamentaux');
      expect(result[0].lessonsCount).toBe(3);
    });

    it('lève une NotFoundException si l\'année n\'existe pas', async () => {
      prismaMock.track.findUnique.mockResolvedValue(null);

      await expect(service.getModulesByTrack('annee-inconnue')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getModuleBySlug', () => {
    it('retourne les détails d\'un module avec leçons, quiz et labs', async () => {
      prismaMock.module.findUnique.mockResolvedValue({
        id: 'mod-1',
        slug: 'reseaux-fondamentaux',
        title: 'Réseaux fondamentaux',
        description: 'Bases réseau',
        position: 1,
        difficulty: 2,
        estimatedMinutes: 120,
        competencyRefs: ['B2.1'],
        track: {
          id: 'track-1',
          slug: 'annee-1',
          title: 'Première Année',
        },
        lessons: [
          {
            id: 'les-1',
            slug: 'adressage-ipv4',
            title: 'Adressage IPv4',
            difficulty: 2,
            estimatedMinutes: 45,
            position: 1,
          },
        ],
        quizzes: [
          {
            id: 'quiz-1',
            slug: 'quiz-adressage',
            title: 'Quiz Adressage',
            passingScore: 80,
            position: 1,
            _count: { questions: 5 },
          },
        ],
        labs: [
          {
            id: 'lab-1',
            slug: 'plan-adressage-pme',
            title: 'Plan d\'adressage PME',
            level: 'LEVEL_2_FILES',
            maxScore: 100,
            estimatedMinutes: 60,
          },
        ],
      });

      const result = await service.getModuleBySlug('reseaux-fondamentaux');
      expect(result.slug).toBe('reseaux-fondamentaux');
      expect(result.lessons).toHaveLength(1);
      expect(result.quizzes).toHaveLength(1);
      expect(result.labs).toHaveLength(1);
      expect(result.quizzes[0].questionsCount).toBe(5);
    });

    it('lève une NotFoundException si le module n\'existe pas', async () => {
      prismaMock.module.findUnique.mockResolvedValue(null);

      await expect(service.getModuleBySlug('module-inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLessonBySlug', () => {
    it('retourne les détails d\'une leçon avec contenu markdown sécurisé', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue({
        id: 'les-1',
        slug: 'adressage-ipv4',
        title: 'Adressage IPv4',
        difficulty: 2,
        estimatedMinutes: 45,
        position: 1,
        objectives: ['Convertir en binaire'],
        prerequisites: [],
        successCriteria: ['Score > 80%'],
        contentPath: 'tracks/annee-1/modules/reseaux-fondamentaux/lessons/01-adressage-ipv4.md',
        module: {
          id: 'mod-1',
          slug: 'reseaux-fondamentaux',
          title: 'Réseaux fondamentaux',
          track: { slug: 'annee-1' },
        },
        lessonLabs: [
          {
            lab: {
              id: 'lab-1',
              slug: 'plan-adressage-pme',
              title: 'Plan d\'adressage PME',
              level: 'LEVEL_2_FILES',
              maxScore: 100,
              estimatedMinutes: 60,
            },
          },
        ],
      });

      const result = await service.getLessonBySlug('adressage-ipv4');
      expect(result.slug).toBe('adressage-ipv4');
      expect(result.content).toBe('# Contenu de test');
      expect(result.relatedLabs).toHaveLength(1);
      expect(lessonReaderMock.readLessonMarkdown).toHaveBeenCalledWith(
        'tracks/annee-1/modules/reseaux-fondamentaux/lessons/01-adressage-ipv4.md',
      );
    });

    it('lève une NotFoundException si la leçon n\'existe pas', async () => {
      prismaMock.lesson.findUnique.mockResolvedValue(null);

      await expect(service.getLessonBySlug('lecon-inconnue')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
