import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { scanContentDirectory } from './scanner.js';
import { validateScannedContent } from './validator.js';
import { executeContentSync } from './sync.service.js';

const contentDir = resolve(__dirname, '../../../../content');

describe('Moteur de Synchronisation de Contenu', () => {
  describe('Scanner et Validateur', () => {
    it('scanne le module de démonstration avec succès', () => {
      const scanned = scanContentDirectory(contentDir);

      expect(scanned.errors).toHaveLength(0);
      expect(scanned.tracks).toHaveLength(1);
      expect(scanned.tracks[0].track.slug).toBe('annee-1');

      const modules = scanned.tracks[0].modules;
      expect(modules).toHaveLength(1);
      expect(modules[0].module.slug).toBe('reseaux-fondamentaux');

      expect(modules[0].lessons).toHaveLength(1);
      expect(modules[0].lessons[0].frontMatter.slug).toBe('adressage-ipv4');

      expect(modules[0].quizzes).toHaveLength(1);
      expect(modules[0].quizzes[0].quiz.slug).toBe('quiz-adressage');

      expect(modules[0].labs).toHaveLength(1);
      expect(modules[0].labs[0].lab.slug).toBe('plan-adressage-pme');
    });

    it('valide l’intégrité référentielle du contenu scanné', () => {
      const scanned = scanContentDirectory(contentDir);
      const errors = validateScannedContent(scanned);

      expect(errors).toHaveLength(0);
    });

    it('détecte une référence de lab inexistante dans une leçon', () => {
      const scanned = scanContentDirectory(contentDir);
      const altered = {
        ...scanned,
        tracks: [
          {
            ...scanned.tracks[0],
            modules: [
              {
                ...scanned.tracks[0].modules[0],
                lessons: [
                  {
                    ...scanned.tracks[0].modules[0].lessons[0],
                    frontMatter: {
                      ...scanned.tracks[0].modules[0].lessons[0].frontMatter,
                      labs: [{ slug: 'lab-inexistant', required: true }],
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const errors = validateScannedContent(altered);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('lab-inexistant');
    });
  });

  describe.skipIf(!process.env.DATABASE_URL)('Exécution de la synchronisation (Base de données)', () => {
    let prisma: PrismaClient;
    let isDbConnected = false;

    beforeAll(async () => {
      if (!process.env.DATABASE_URL) {
        return;
      }
      try {
        prisma = new PrismaClient();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
        ]);
        isDbConnected = true;
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected) {
        await prisma.$disconnect().catch(() => {});
      }
    });

    it('synchronise le contenu en base de données et peuple toutes les tables', async (ctx) => {
      if (!isDbConnected) {
        ctx.skip();
        return;
      }

      const report = await executeContentSync(prisma, contentDir);

      expect(report.success).toBe(true);
      expect(report.errors).toHaveLength(0);

      // Vérifier les enregistrements en base
      const track = await prisma.track.findUnique({ where: { slug: 'annee-1' } });
      expect(track).toBeDefined();
      expect(track?.title).toBe('BTS SIO SISR — 1ère année');

      const moduleRecord = await prisma.module.findUnique({ where: { slug: 'reseaux-fondamentaux' } });
      expect(moduleRecord).toBeDefined();
      expect(moduleRecord?.trackId).toBe(track?.id);

      const lesson = await prisma.lesson.findUnique({ where: { slug: 'adressage-ipv4' } });
      expect(lesson).toBeDefined();
      expect(lesson?.moduleId).toBe(moduleRecord?.id);

      const quiz = await prisma.quiz.findUnique({
        where: { slug: 'quiz-adressage' },
        include: { questions: true },
      });
      expect(quiz).toBeDefined();
      expect(quiz?.questions.length).toBe(5);

      const lab = await prisma.lab.findUnique({ where: { slug: 'plan-adressage-pme' } });
      expect(lab).toBeDefined();
      expect(lab?.level).toBe('LEVEL_2_FILES');

      const lessonLabs = await prisma.lessonLab.findMany({
        where: { lessonId: lesson!.id, labId: lab!.id },
      });
      expect(lessonLabs).toHaveLength(1);
      expect(lessonLabs[0].required).toBe(true);
    });

    it('est parfaitement idempotente lors d’une seconde exécution', async (ctx) => {
      if (!isDbConnected) {
        ctx.skip();
        return;
      }

      const firstReport = await executeContentSync(prisma, contentDir);
      expect(firstReport.success).toBe(true);

      const questionsBefore = await prisma.quizQuestion.findMany({
        orderBy: { position: 'asc' },
        select: { id: true, position: true, prompt: true },
      });

      const secondReport = await executeContentSync(prisma, contentDir);
      expect(secondReport.success).toBe(true);
      expect(secondReport.stats.tracks.created).toBe(0);
      expect(secondReport.stats.modules.created).toBe(0);
      expect(secondReport.stats.lessons.created).toBe(0);
      expect(secondReport.stats.quizzes.created).toBe(0);
      expect(secondReport.stats.quizQuestions.created).toBe(0);
      expect(secondReport.stats.quizQuestions.unchanged).toBe(5);
      expect(secondReport.stats.labs.created).toBe(0);
      expect(secondReport.stats.lessonLabs.created).toBe(0);
      expect(secondReport.stats.lessonLabs.unchanged).toBe(1);

      const questionsAfter = await prisma.quizQuestion.findMany({
        orderBy: { position: 'asc' },
        select: { id: true, position: true, prompt: true },
      });

      // Vérifier que les IDs des questions n'ont absolument pas changé
      expect(questionsAfter).toEqual(questionsBefore);

      // Le nombre d'éléments en base n'a pas changé
      const tracksCount = await prisma.track.count();
      const modulesCount = await prisma.module.count();
      const lessonsCount = await prisma.lesson.count();
      const quizzesCount = await prisma.quiz.count();
      const questionsCount = await prisma.quizQuestion.count();
      const labsCount = await prisma.lab.count();
      const lessonLabsCount = await prisma.lessonLab.count();

      expect(tracksCount).toBe(1);
      expect(modulesCount).toBe(1);
      expect(lessonsCount).toBe(1);
      expect(quizzesCount).toBe(1);
      expect(questionsCount).toBe(5);
      expect(labsCount).toBe(1);
      expect(lessonLabsCount).toBe(1);
    });
  });
});
