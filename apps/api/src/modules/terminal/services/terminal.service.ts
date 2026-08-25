import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PrismaService } from '../../../prisma/prisma.service';
import { LabSessionStatus, LabEventKind } from '@prisma/client';
import { SimulationCommandInterpreter } from './simulation-command-interpreter.service';
import type { TerminalCommandResult, TerminalStatusResult } from '../dto/terminal-response.dto';

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private readonly baseTempDir = path.join(os.tmpdir(), 'opensio-labs');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SimulationCommandInterpreter) private readonly interpreter: SimulationCommandInterpreter
  ) {}

  /**
   * Vérifie qu'une session de lab existe, appartient à l'utilisateur et est active.
   */
  async getAndVerifySession(sessionId: string, userId: string) {
    const session = await this.prisma.labSession.findUnique({
      where: { id: sessionId },
      include: { lab: true },
    });

    if (!session) {
      throw new NotFoundException(`Session de lab ${sessionId} introuvable.`);
    }

    if (session.userId !== userId) {
      this.logger.warn(
        `[Terminal] Tentative d'accès non autorisé à la session ${sessionId} par l'utilisateur ${userId}`
      );
      throw new ForbiddenException("Vous n'êtes pas autorisé à accéder au terminal de cette session.");
    }

    if (session.status !== LabSessionStatus.RUNNING) {
      throw new BadRequestException(
        `Impossible d'ouvrir le terminal : la session est au statut '${session.status}'.`
      );
    }

    return session;
  }

  /**
   * Récupère le statut initial et la bannière du terminal pour une session.
   */
  async getTerminalStatus(sessionId: string, userId: string): Promise<TerminalStatusResult> {
    const session = await this.getAndVerifySession(sessionId, userId);
    const workDir = path.join(this.baseTempDir, sessionId);

    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    // Journaliser l'ouverture du terminal dans LabEvent
    await this.prisma.labEvent.create({
      data: {
        sessionId: session.id,
        kind: LabEventKind.TERMINAL_OPENED,
        payload: {
          openedAt: new Date().toISOString(),
          labSlug: session.lab.slug,
          userId,
        },
      },
    });

    return {
      active: true,
      sessionId: session.id,
      labSlug: session.lab.slug,
      prompt: `student@opensio-lab-${sessionId.slice(0, 4)}:~$ `,
      banner: [
        '╔══════════════════════════════════════════════════════════════╗',
        '║           OpenSIO — Terminal Virtuel d\'Atelier              ║',
        '║  Environnement : Debian 12 (Simulation Sécurisée)            ║',
        '║  Tapez "help" pour afficher les commandes disponibles.       ║',
        '╚══════════════════════════════════════════════════════════════╝',
      ].join('\n'),
    };
  }

  /**
   * Exécute une commande dans le terminal simulé et journalise l'événement.
   */
  async executeCommand(
    sessionId: string,
    userId: string,
    rawCommand: string
  ): Promise<TerminalCommandResult> {
    const session = await this.getAndVerifySession(sessionId, userId);
    const workDir = path.join(this.baseTempDir, sessionId);

    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    const result = await this.interpreter.interpret(sessionId, rawCommand, workDir);

    // Journaliser l'exécution de la commande dans LabEvent
    try {
      await this.prisma.labEvent.create({
        data: {
          sessionId: session.id,
          kind: LabEventKind.TERMINAL_COMMAND,
          payload: {
            command: rawCommand,
            exitCode: result.exitCode,
            stdoutSnippet: result.stdout.slice(0, 500),
            stderrSnippet: result.stderr.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (err: unknown) {
      this.logger.error(`Erreur lors de la journalisation LabEvent: ${String(err)}`);
    }

    return result;
  }
}
