import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { LabsService } from '../services/labs.service';
import { LabSessionsService } from '../services/lab-sessions.service';
import { LabScoringService } from '../services/lab-scoring.service';
import { LabValidationService } from '../services/lab-validation.service';
import { SimulationLabRunner } from '../runners/simulation-lab-runner.service';
import { LabsController } from '../labs.controller';
import { executeContentSync } from '../../../sync/sync.service';
import { CatalogCacheService } from '../../catalog/catalog-cache.service';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';
import { Role } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

import { LabSessionFormatterService } from '../services/lab-session-formatter.service';

const TEST_SECRET = 'd'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)(
  'Labs Module — Tests d\'Intégration PostgreSQL, Zéro-Fuite & Cycle de Vie (§22.5 / RM-04 / RM-05 / RM-12)',
  () => {
    let prisma: PrismaService;
    let isDbConnected = false;
    let labsService: LabsService;
    let sessionsService: LabSessionsService;
    let scoringService: LabScoringService;
    let validationService: LabValidationService;
    let runner: SimulationLabRunner;
    let auditService: AuditService;
    let controller: LabsController;

    const contentDir = path.resolve(__dirname, '../../../../../../content');
    const lucasEmail = 'lucas.lab.test@opensio.local';
    const emmaEmail = 'emma.lab.test@opensio.local';
    let lucasUser: { id: string; email: string; displayName: string; role: Role };
    let emmaUser: { id: string; email: string; displayName: string; role: Role };
    let lucasAuth: AuthenticatedUser;
    let emmaAuth: AuthenticatedUser;

    beforeAll(async () => {
      process.env.JWT_SECRET = TEST_SECRET;
      process.env.CONTENT_PATH = contentDir;
      process.env.LAB_RUNNER = 'simulation';

      try {
        prisma = new PrismaService();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        isDbConnected = true;

        auditService = new AuditService(prisma);
        runner = new SimulationLabRunner();
        labsService = new LabsService(prisma);
        const formatterService = new LabSessionFormatterService(labsService, runner);
        scoringService = new LabScoringService();
        sessionsService = new LabSessionsService(
          prisma,
          auditService,
          labsService,
          runner,
          formatterService
        );
        validationService = new LabValidationService(
          prisma,
          auditService,
          labsService,
          sessionsService,
          scoringService,
          runner
        );
        controller = new LabsController(labsService, sessionsService, validationService);

        const cacheService = new CatalogCacheService();
        await executeContentSync(prisma, contentDir, cacheService);

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

        lucasUser = await prisma.user.create({
          data: {
            email: lucasEmail,
            displayName: 'Lucas SISR',
            passwordHash: 'dummy_hash_argon2',
            role: Role.APPRENANT,
          },
        });

        emmaUser = await prisma.user.create({
          data: {
            email: emmaEmail,
            displayName: 'Emma SISR',
            passwordHash: 'dummy_hash_argon2',
            role: Role.APPRENANT,
          },
        });

        lucasAuth = {
          id: lucasUser.id,
          email: lucasUser.email,
          displayName: lucasUser.displayName,
          role: lucasUser.role,
        };

        emmaAuth = {
          id: emmaUser.id,
          email: emmaUser.email,
          displayName: emmaUser.displayName,
          role: emmaUser.role,
        };
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected) {
        for (const u of [lucasUser, emmaUser]) {
          if (u?.id) {
            await prisma.labEvent.deleteMany({ where: { session: { userId: u.id } } });
            await prisma.labSession.deleteMany({ where: { userId: u.id } });
            await prisma.activityEvent.deleteMany({ where: { userId: u.id } });
            await prisma.auditLog.deleteMany({ where: { actorId: u.id } });
            await prisma.user.deleteMany({ where: { id: u.id } });
          }
        }
        await prisma.$disconnect();
      }
    });

    it('GET /labs/:slug — retourne la définition publique avec ZÉRO fuite de solution ni d’indice', async () => {
      if (!isDbConnected) return;

      const lab = await controller.getLab('plan-adressage-pme', lucasAuth);
      expect(lab).toBeDefined();
      expect(lab.slug).toBe('plan-adressage-pme');
      expect(lab.title).toBe("Plan d'adressage d'une PME");
      expect(lab.level).toBe('2_files');
      expect(lab.maxScore).toBe(100);
      expect(lab.editableFiles).toHaveLength(1);
      expect(lab.editableFiles[0].path).toBe('plan.csv');
      expect(lab.editableFiles[0].initialContent).toContain('service,network,prefix,gateway');
      expect(lab.hintsCount).toBe(2);
      expect(lab.hintsSummary).toEqual([
        { index: 1, costPercent: 10 },
        { index: 2, costPercent: 10 },
      ]);
      const rawLab = lab as unknown as Record<string, unknown>;
      expect(rawLab.hints).toBeUndefined();
      expect(rawLab.solutions).toBeUndefined();
      expect(rawLab.validatorScript).toBeUndefined();
    });

    it('Cycle de vie complet d’une session (Démarrage -> Fichiers -> Indice -> Validation -> Succès)', async () => {
      if (!isDbConnected) return;

      // 1. Démarrage de la session
      const session = await controller.startSession('plan-adressage-pme', lucasAuth);
      expect(session).toBeDefined();
      expect(session.status).toBe('running');
      expect(session.hintsUsed).toBe(0);
      expect(session.unlockedHints).toHaveLength(0);
      expect(session.files).toHaveLength(1);
      expect(session.files[0].path).toBe('plan.csv');

      const sessionId = session.id;

      // 2. Sauvegarde des fichiers édités avec une solution valide
      const validCsvContent = `service,network,prefix,gateway,first_host,last_host,broadcast
Production,10.20.0.0,26,10.20.0.1,10.20.0.1,10.20.0.62,10.20.0.63
Invites,10.20.0.64,27,10.20.0.65,10.20.0.65,10.20.0.94,10.20.0.95
Comptabilite,10.20.0.96,28,10.20.0.97,10.20.0.97,10.20.0.110,10.20.0.111`;

      const saveRes = await controller.saveFiles(
        'plan-adressage-pme',
        sessionId,
        { files: [{ path: 'plan.csv', content: validCsvContent }] },
        lucasAuth
      );
      expect(saveRes.success).toBe(true);

      // 3. Demande d’un indice (RM-05 : -10% de pénalité)
      const hintRes = await controller.consumeHint('plan-adressage-pme', sessionId, lucasAuth);
      expect(hintRes.hintIndex).toBe(1);
      expect(hintRes.costPercent).toBe(10);
      expect(hintRes.hintsUsed).toBe(1);
      expect(hintRes.text).toContain('Production');

      // 4. Lancement de la validation côté serveur
      const verdict = await controller.validateSession(
        'plan-adressage-pme',
        sessionId,
        {},
        lucasAuth
      );

      expect(verdict.passed).toBe(true);
      expect(verdict.status).toBe('passed');
      // Score : 100 points brut - 10% pénalité indice = 90 points
      expect(verdict.score).toBe(90);
      expect(verdict.checks.every((c) => c.passed)).toBe(true);

      // 5. Vérification de l'état final en base de données
      const refreshedSession = await controller.getSession('plan-adressage-pme', sessionId, lucasAuth);
      expect(refreshedSession.status).toBe('passed');
      expect(refreshedSession.score).toBe(90);
      expect(refreshedSession.completedAt).not.toBeNull();
      expect(refreshedSession.unlockedHints).toHaveLength(1);

      // 6. Vérification des événements d'activité et lab_events
      const labEvents = await prisma.labEvent.findMany({ where: { sessionId } });
      const kinds = labEvents.map((e) => e.kind);
      expect(kinds).toContain('STARTED');
      expect(kinds).toContain('FILE_SAVED');
      expect(kinds).toContain('HINT_USED');
      expect(kinds).toContain('PASSED');

      const activity = await prisma.activityEvent.findFirst({
        where: { userId: lucasUser.id, kind: 'LAB_COMPLETED' },
      });
      expect(activity).toBeDefined();
    });

    it('Isolation inter-utilisateurs : Emma ne peut ni lire ni agir sur la session de Lucas', async () => {
      if (!isDbConnected) return;

      // Lucas démarre une nouvelle session
      const lucasSession = await controller.startSession('plan-adressage-pme', lucasAuth);

      // Emma tente de lire la session de Lucas -> ForbiddenException
      await expect(
        controller.getSession('plan-adressage-pme', lucasSession.id, emmaAuth)
      ).rejects.toThrow(ForbiddenException);

      // Emma tente de modifier les fichiers de la session de Lucas -> ForbiddenException
      await expect(
        controller.saveFiles(
          'plan-adressage-pme',
          lucasSession.id,
          { files: [{ path: 'plan.csv', content: 'hacked' }] },
          emmaAuth
        )
      ).rejects.toThrow(ForbiddenException);

      // Emma tente de valider la session de Lucas -> ForbiddenException
      await expect(
        controller.validateSession('plan-adressage-pme', lucasSession.id, {}, emmaAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('Rejette les modifications et validations après complétion de la session', async () => {
      if (!isDbConnected) return;

      const session = await controller.startSession('plan-adressage-pme', lucasAuth);
      // Stopper la session pour la passer à FAILED
      await controller.stopSession('plan-adressage-pme', session.id, lucasAuth);

      // Tentative de sauvegarde de fichiers sur session arrêtée -> BadRequestException
      await expect(
        controller.saveFiles(
          'plan-adressage-pme',
          session.id,
          { files: [{ path: 'plan.csv', content: 'test' }] },
          lucasAuth
        )
      ).rejects.toThrow(BadRequestException);

      // Tentative de validation sur session arrêtée -> BadRequestException
      await expect(
        controller.validateSession('plan-adressage-pme', session.id, {}, lucasAuth)
      ).rejects.toThrow(BadRequestException);
    });
  }
);
