import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LabSessionStatus, LabEventKind } from '@prisma/client';
import { LabSessionsService } from '../services/lab-sessions.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { LabRunner } from '../runners/lab-runner.interface';
import type { LabSessionFormatterService } from '../services/lab-session-formatter.service';
import type { LabsService } from '../services/labs.service';
import type { AuditService } from '../../audit/audit.service';
import type { PrismaService } from '../../../prisma/prisma.service';

describe('LabSessionsService (Machine à états & Sécurité)', () => {
  let service: LabSessionsService;
  let prismaMock: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let auditMock: { logEvent: ReturnType<typeof vi.fn> };
  let labsMock: { loadLabDefinition: ReturnType<typeof vi.fn> };
  let runnerMock: LabRunner;

  const mockLab = {
    id: 'lab-uuid-1',
    slug: 'plan-adressage-pme',
    title: 'Plan d’adressage d’une PME',
    level: 'LEVEL_2_FILES',
    maxScore: 100,
    definitionPath: 'tracks/annee-1/modules/reseaux-fondamentaux/labs/lab-plan-adressage/lab.yaml',
  };

  const mockLabDef = {
    slug: 'plan-adressage-pme',
    title: 'Plan d’adressage d’une PME',
    level: '2_files',
    max_score: 100,
    estimated_minutes: 40,
    context: 'Contexte...',
    objectives: ['Obj 1'],
    files: {
      editable: [{ path: 'plan.csv' }],
    },
    hints: [
      { cost_percent: 10, text: 'Premier indice' },
      { cost_percent: 10, text: 'Deuxième indice' },
    ],
    validation: {
      checks: [{ id: 'subnets_valid', required: true, points: 60 }],
    },
  };

  beforeEach(() => {
    prismaMock = {
      lab: {
        findUnique: vi.fn(),
      },
      labSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      labEvent: {
        create: vi.fn(),
      },
      activityEvent: {
        create: vi.fn(),
      },
    };

    auditMock = {
      logEvent: vi.fn(),
    };

    labsMock = {
      loadLabDefinition: vi.fn().mockReturnValue(mockLabDef),
    };

    runnerMock = {
      kind: 'simulation',
      start: vi.fn().mockResolvedValue({ kind: 'simulation', workDir: '/tmp/test' }),
      saveFiles: vi.fn().mockResolvedValue(undefined),
      getFiles: vi.fn().mockResolvedValue([{ path: 'plan.csv', content: 'header' }]),
      validate: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockResolvedValue({ active: true }),
    };

    const formatterMock = {
      formatSessionDto: vi.fn().mockImplementation((session: { id: string; labId: string; lab: { slug: string }; status: string; hintsUsed: number }) => ({
        id: session.id,
        labId: session.labId,
        labSlug: session.lab.slug,
        status: session.status.toLowerCase(),
        hintsUsed: session.hintsUsed,
        files: [{ path: 'plan.csv', content: 'header' }],
      })),
    };

    service = new LabSessionsService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
      labsMock as unknown as LabsService,
      runnerMock,
      formatterMock as unknown as LabSessionFormatterService
    );
  });

  it('démarre une nouvelle session en état RUNNING avec calcul du TTL', async () => {
    prismaMock.lab.findUnique.mockResolvedValue(mockLab);
    prismaMock.labSession.findFirst.mockResolvedValue(null);

    const createdSession = {
      id: 'session-uuid-1',
      labId: mockLab.id,
      userId: 'user-1',
      status: LabSessionStatus.RUNNING,
      hintsUsed: 0,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      completedAt: null,
      runtimeRef: null,
      lastResult: null,
      lab: mockLab,
    };
    prismaMock.labSession.create.mockResolvedValue(createdSession);

    const result = await service.startSession('user-1', 'plan-adressage-pme');

    expect(result.id).toBe('session-uuid-1');
    expect(result.status).toBe('running');
    expect(runnerMock.start).toHaveBeenCalled();
    expect(prismaMock.labEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'session-uuid-1',
          kind: LabEventKind.STARTED,
        }),
      })
    );
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          kind: 'LAB_STARTED',
        }),
      })
    );
  });

  it('réutilise une session active non expirée', async () => {
    prismaMock.lab.findUnique.mockResolvedValue(mockLab);
    const existingSession = {
      id: 'session-existing-1',
      labId: mockLab.id,
      userId: 'user-1',
      status: LabSessionStatus.RUNNING,
      hintsUsed: 0,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // expire dans 30m
      completedAt: null,
      runtimeRef: { kind: 'simulation' },
      lastResult: null,
      lab: mockLab,
    };
    prismaMock.labSession.findFirst.mockResolvedValue(existingSession);

    const result = await service.startSession('user-1', 'plan-adressage-pme');

    expect(result.id).toBe('session-existing-1');
    expect(prismaMock.labSession.create).not.toHaveBeenCalled();
  });

  it('lève ForbiddenException si un utilisateur tente d’accéder à la session d’un autre', async () => {
    prismaMock.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-lucas',
      lab: mockLab,
      status: LabSessionStatus.RUNNING,
      expiresAt: new Date(Date.now() + 100000),
    });

    await expect(
      service.getSession('user-emma', 'plan-adressage-pme', 'session-1')
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève BadRequestException si l’on tente de sauvegarder des fichiers sur une session non RUNNING', async () => {
    prismaMock.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      lab: mockLab,
      status: LabSessionStatus.PASSED,
      expiresAt: new Date(Date.now() + 100000),
    });

    await expect(
      service.saveFiles('user-1', 'plan-adressage-pme', 'session-1', [
        { path: 'plan.csv', content: 'test' },
      ])
    ).rejects.toThrow(BadRequestException);
  });

  it('rejette les fichiers non autorisés ou contenant du path traversal', async () => {
    prismaMock.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      lab: mockLab,
      status: LabSessionStatus.RUNNING,
      expiresAt: new Date(Date.now() + 100000),
    });

    // Fichier non éditable
    await expect(
      service.saveFiles('user-1', 'plan-adressage-pme', 'session-1', [
        { path: 'exploit.sh', content: 'rm -rf /' },
      ])
    ).rejects.toThrow(BadRequestException);

    // Path traversal
    await expect(
      service.saveFiles('user-1', 'plan-adressage-pme', 'session-1', [
        { path: '../plan.csv', content: 'exploit' },
      ])
    ).rejects.toThrow(BadRequestException);
  });

  it('débloque un indice avec enregistrement HINT_USED et incrémentation de hintsUsed', async () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      lab: mockLab,
      status: LabSessionStatus.RUNNING,
      hintsUsed: 0,
      expiresAt: new Date(Date.now() + 100000),
    };
    prismaMock.labSession.findUnique.mockResolvedValue(session);

    const hintRes = await service.consumeHint('user-1', 'plan-adressage-pme', 'session-1');

    expect(hintRes.hintIndex).toBe(1);
    expect(hintRes.costPercent).toBe(10);
    expect(hintRes.text).toBe('Premier indice');
    expect(prismaMock.labSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: { hintsUsed: 1 },
      })
    );
    expect(prismaMock.labEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'session-1',
          kind: LabEventKind.HINT_USED,
        }),
      })
    );
  });

  it('arrête une session et passe le statut à FAILED', async () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      lab: mockLab,
      status: LabSessionStatus.RUNNING,
      hintsUsed: 0,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      completedAt: null,
      runtimeRef: null,
      lastResult: null,
    };
    prismaMock.labSession.findUnique.mockResolvedValue(session);
    prismaMock.labSession.update.mockResolvedValue({
      ...session,
      status: LabSessionStatus.FAILED,
    });

    const result = await service.stopSession('user-1', 'plan-adressage-pme', 'session-1');

    expect(result.status).toBe('failed');
    expect(runnerMock.stop).toHaveBeenCalled();
    expect(prismaMock.labEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'session-1',
          kind: LabEventKind.FAILED,
        }),
      })
    );
  });
});
