import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TerminalService } from '../services/terminal.service';
import { LabSessionStatus, LabEventKind } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { SimulationCommandInterpreter } from '../services/simulation-command-interpreter.service';

interface MockPrisma {
  labSession: { findUnique: ReturnType<typeof vi.fn> };
  labEvent: { create: ReturnType<typeof vi.fn> };
}

interface MockInterpreter {
  interpret: ReturnType<typeof vi.fn>;
}

describe('TerminalService (Gestion des sessions & Journalisation)', () => {
  let terminalService: TerminalService;
  let mockPrisma: MockPrisma;
  let mockInterpreter: MockInterpreter;

  beforeEach(() => {
    mockPrisma = {
      labSession: {
        findUnique: vi.fn(),
      },
      labEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    mockInterpreter = {
      interpret: vi.fn().mockResolvedValue({
        stdout: 'eth0: 192.168.1.50',
        stderr: '',
        exitCode: 0,
        cwd: '',
      }),
    };

    terminalService = new TerminalService(
      mockPrisma as unknown as PrismaService,
      mockInterpreter as unknown as SimulationCommandInterpreter
    );
  });

  it('lève NotFoundException si la session de lab n’existe pas', async () => {
    mockPrisma.labSession.findUnique.mockResolvedValue(null);

    await expect(
      terminalService.getAndVerifySession('non-existent', 'user-1')
    ).rejects.toThrow(NotFoundException);
  });

  it('lève ForbiddenException si la session n’appartient pas à l’utilisateur connecté', async () => {
    mockPrisma.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-lucas',
      status: LabSessionStatus.RUNNING,
      lab: { slug: 'lab-dns' },
    });

    await expect(
      terminalService.getAndVerifySession('session-1', 'user-emma')
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève BadRequestException si la session n’est pas au statut RUNNING', async () => {
    mockPrisma.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-lucas',
      status: LabSessionStatus.PASSED,
      lab: { slug: 'lab-dns' },
    });

    await expect(
      terminalService.getAndVerifySession('session-1', 'user-lucas')
    ).rejects.toThrow(BadRequestException);
  });

  it('exécute une commande et journalise l’événement LabEvent TERMINAL_COMMAND', async () => {
    mockPrisma.labSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-lucas',
      status: LabSessionStatus.RUNNING,
      lab: { slug: 'lab-dns' },
    });

    const result = await terminalService.executeCommand('session-1', 'user-lucas', 'ip a');

    expect(result.stdout).toContain('192.168.1.50');
    expect(mockInterpreter.interpret).toHaveBeenCalled();
    expect(mockPrisma.labEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: 'session-1',
        kind: LabEventKind.TERMINAL_COMMAND,
        payload: expect.objectContaining({
          command: 'ip a',
          exitCode: 0,
        }),
      }),
    });
  });
});
