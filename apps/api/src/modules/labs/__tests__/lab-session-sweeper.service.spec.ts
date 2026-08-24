import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabSessionSweeperService } from '../services/lab-session-sweeper.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { LabSessionsService } from '../services/lab-sessions.service';

describe('LabSessionSweeperService (Nettoyage automatique des sandboxes)', () => {
  let sweeper: LabSessionSweeperService;
  let prismaMock: { labSession: { findMany: ReturnType<typeof vi.fn> } };
  let sessionsServiceMock: { expireSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prismaMock = {
      labSession: {
        findMany: vi.fn(),
      },
    };

    sessionsServiceMock = {
      expireSession: vi.fn().mockResolvedValue(undefined),
    };

    sweeper = new LabSessionSweeperService(
      prismaMock as unknown as PrismaService,
      sessionsServiceMock as unknown as LabSessionsService
    );
  });

  it('ne fait rien si aucune session n’est expirée', async () => {
    prismaMock.labSession.findMany.mockResolvedValue([]);

    const count = await sweeper.sweepExpiredSessions();
    expect(count).toBe(0);
    expect(sessionsServiceMock.expireSession).not.toHaveBeenCalled();
  });

  it('nettoie et expire toutes les sessions dont le TTL est dépassé', async () => {
    const expiredSessions = [
      { id: 'session-1', lab: { slug: 'plan-adressage', level: '2_files', definitionPath: 'path' } },
      { id: 'session-2', lab: { slug: 'plan-adressage', level: '2_files', definitionPath: 'path' } },
    ];
    prismaMock.labSession.findMany.mockResolvedValue(expiredSessions);

    const count = await sweeper.sweepExpiredSessions();
    expect(count).toBe(2);
    expect(sessionsServiceMock.expireSession).toHaveBeenCalledTimes(2);
    expect(sessionsServiceMock.expireSession).toHaveBeenCalledWith(expiredSessions[0]);
    expect(sessionsServiceMock.expireSession).toHaveBeenCalledWith(expiredSessions[1]);
  });
});
