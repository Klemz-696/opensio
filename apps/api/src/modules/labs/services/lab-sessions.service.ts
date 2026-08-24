import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, LabSessionStatus, LabEventKind } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { LabsService } from './labs.service';
import {
  LAB_RUNNER_TOKEN,
  type LabRunner,
  type LabSessionContext,
  type EditedFile,
} from '../runners/lab-runner.interface';
import { LabSessionFormatterService } from './lab-session-formatter.service';
import type {
  LabSessionDto,
  LabHintResponseDto,
} from '../dto/lab-responses.dto';

@Injectable()
export class LabSessionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(LabsService) private readonly labsService: LabsService,
    @Inject(LAB_RUNNER_TOKEN) private readonly labRunner: LabRunner,
    @Inject(LabSessionFormatterService)
    private readonly formatterService: LabSessionFormatterService
  ) {}

  /**
   * Démarre une nouvelle session de lab ou réutilise une session en cours active.
   */
  async startSession(userId: string, labSlug: string, ip?: string | null): Promise<LabSessionDto> {
    const normalizedSlug = labSlug.toLowerCase().trim();

    const lab = await this.prisma.lab.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!lab) {
      throw new NotFoundException(`Lab introuvable : ${labSlug}`);
    }

    const now = new Date();

    // Vérification d'une session existante pour cet utilisateur
    const existingSession = await this.prisma.labSession.findFirst({
      where: {
        userId,
        labId: lab.id,
        status: LabSessionStatus.RUNNING,
      },
      include: { lab: true },
      orderBy: { startedAt: 'desc' },
    });

    if (existingSession) {
      if (existingSession.expiresAt > now) {
        return this.formatSessionDto(existingSession);
      }
      // Session expirée -> transition vers EXPIRED
      await this.expireSession(existingSession);
    }

    const ttlMinutes = parseInt(process.env.LAB_SESSION_TTL_MINUTES || '45', 10);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const session = await this.prisma.labSession.create({
      data: {
        labId: lab.id,
        userId,
        status: LabSessionStatus.RUNNING,
        hintsUsed: 0,
        startedAt: now,
        expiresAt,
      },
      include: { lab: true },
    });

    const context: LabSessionContext = {
      sessionId: session.id,
      labSlug: lab.slug,
      labLevel: lab.level,
      definitionPath: lab.definitionPath,
    };

    const runtimeRef = await this.labRunner.start(context);

    await Promise.all([
      this.prisma.labSession.update({
        where: { id: session.id },
        data: { runtimeRef: runtimeRef as unknown as Prisma.InputJsonValue },
      }),
      this.prisma.labEvent.create({
        data: {
          sessionId: session.id,
          kind: LabEventKind.STARTED,
          payload: { ttlMinutes, runnerKind: this.labRunner.kind },
        },
      }),
      this.prisma.activityEvent.create({
        data: {
          userId,
          kind: 'LAB_STARTED',
          entityType: 'lab',
          entityId: lab.id,
          metadata: { labSlug: lab.slug, labTitle: lab.title, sessionId: session.id },
        },
      }),
      this.auditService.logEvent({
        action: 'LAB_SESSION_STARTED',
        actorId: userId,
        targetType: 'lab_session',
        targetId: session.id,
        metadata: { labSlug: lab.slug, sessionId: session.id },
        ip: ip ?? null,
      }),
    ]);

    session.runtimeRef = runtimeRef as unknown as Prisma.JsonValue;
    return this.formatSessionDto(session);
  }

  /**
   * Récupère l'état d'une session de lab avec vérification stricte de propriété.
   */
  async getSession(userId: string, labSlug: string, sessionId: string): Promise<LabSessionDto> {
    const session = await this.findAndAuthorizeSession(userId, labSlug, sessionId);

    // Vérification du TTL
    if (session.status === LabSessionStatus.RUNNING && session.expiresAt <= new Date()) {
      await this.expireSession(session);
      session.status = LabSessionStatus.EXPIRED;
    }

    return this.formatSessionDto(session);
  }

  /**
   * Sauvegarde les fichiers de travail dans la session de lab.
   */
  async saveFiles(
    userId: string,
    labSlug: string,
    sessionId: string,
    files: EditedFile[]
  ): Promise<{ success: boolean; savedFiles: Array<{ path: string; size: number }> }> {
    const session = await this.findAndAuthorizeSession(userId, labSlug, sessionId);

    if (session.status !== LabSessionStatus.RUNNING) {
      throw new BadRequestException('La session de lab n’est pas en cours d’exécution');
    }

    if (session.expiresAt <= new Date()) {
      await this.expireSession(session);
      throw new BadRequestException('La session de lab a expiré');
    }

    const labDef = this.labsService.loadLabDefinition(session.lab.definitionPath);
    const allowedPaths = new Set((labDef.files?.editable || []).map((f) => f.path));

    for (const file of files) {
      if (!allowedPaths.has(file.path)) {
        throw new BadRequestException(`Le fichier ${file.path} n’est pas modifiable pour ce lab.`);
      }
      if (file.path.includes('..') || file.path.startsWith('/') || file.path.startsWith('\\')) {
        throw new BadRequestException(`Chemin de fichier interdit : ${file.path}`);
      }
    }

    const context: LabSessionContext = {
      sessionId: session.id,
      labSlug: session.lab.slug,
      labLevel: session.lab.level,
      definitionPath: session.lab.definitionPath,
      runtimeRef: session.runtimeRef as Record<string, unknown> | null,
    };

    await this.labRunner.saveFiles(context, files);

    const savedFiles = files.map((f) => ({ path: f.path, size: f.content.length }));

    await this.prisma.labEvent.create({
      data: {
        sessionId: session.id,
        kind: LabEventKind.FILE_SAVED,
        payload: { savedFiles },
      },
    });

    return { success: true, savedFiles };
  }

  /**
   * Débloque le prochain indice disponible pour la session.
   */
  async consumeHint(userId: string, labSlug: string, sessionId: string): Promise<LabHintResponseDto> {
    const session = await this.findAndAuthorizeSession(userId, labSlug, sessionId);

    if (session.status !== LabSessionStatus.RUNNING) {
      throw new BadRequestException('Impossible de débloquer un indice : session non active');
    }

    if (session.expiresAt <= new Date()) {
      await this.expireSession(session);
      throw new BadRequestException('La session de lab a expiré');
    }

    const labDef = this.labsService.loadLabDefinition(session.lab.definitionPath);
    const totalHints = (labDef.hints || []).length;

    if (session.hintsUsed >= totalHints) {
      throw new BadRequestException('Tous les indices disponibles ont déjà été débloqués.');
    }

    const nextHintIndex = session.hintsUsed;
    const nextHint = labDef.hints[nextHintIndex];
    const newHintsUsed = session.hintsUsed + 1;

    await this.prisma.labSession.update({
      where: { id: session.id },
      data: { hintsUsed: newHintsUsed },
    });

    await this.prisma.labEvent.create({
      data: {
        sessionId: session.id,
        kind: LabEventKind.HINT_USED,
        payload: {
          hintIndex: newHintsUsed,
          costPercent: nextHint.cost_percent,
        },
      },
    });

    return {
      hintIndex: newHintsUsed,
      costPercent: nextHint.cost_percent,
      text: nextHint.text,
      hintsUsed: newHintsUsed,
      totalHints,
    };
  }

  /**
   * Arrête explicitement et nettoie la session de lab.
   */
  async stopSession(
    userId: string,
    labSlug: string,
    sessionId: string,
    ip?: string | null
  ): Promise<LabSessionDto> {
    const session = await this.findAndAuthorizeSession(userId, labSlug, sessionId);

    if (session.status === LabSessionStatus.RUNNING) {
      const context: LabSessionContext = {
        sessionId: session.id,
        labSlug: session.lab.slug,
        labLevel: session.lab.level,
        definitionPath: session.lab.definitionPath,
        runtimeRef: session.runtimeRef as Record<string, unknown> | null,
      };

      await this.labRunner.stop(context);

      const [updated] = await Promise.all([
        this.prisma.labSession.update({
          where: { id: session.id },
          data: { status: LabSessionStatus.FAILED, completedAt: new Date() },
          include: { lab: true },
        }),
        this.prisma.labEvent.create({
          data: {
            sessionId: session.id,
            kind: LabEventKind.FAILED,
            payload: { reason: 'user_stopped' },
          },
        }),
        this.prisma.labEvent.create({
          data: {
            sessionId: session.id,
            kind: LabEventKind.CLEANUP,
            payload: { reason: 'stop_session' },
          },
        }),
        this.auditService.logEvent({
          action: 'LAB_SESSION_STOPPED',
          actorId: userId,
          targetType: 'lab_session',
          targetId: session.id,
          metadata: { labSlug, sessionId },
          ip: ip ?? null,
        }),
      ]);

      return this.formatSessionDto(updated);
    }

    return this.formatSessionDto(session);
  }

  /**
   * Expiration automatique d'une session.
   */
  async expireSession(session: { id: string; lab: { slug: string; level: string; definitionPath: string }; runtimeRef?: Prisma.JsonValue }): Promise<void> {
    const context: LabSessionContext = {
      sessionId: session.id,
      labSlug: session.lab.slug,
      labLevel: session.lab.level,
      definitionPath: session.lab.definitionPath,
      runtimeRef: session.runtimeRef as Record<string, unknown> | null,
    };

    await this.labRunner.stop(context);

    await Promise.all([
      this.prisma.labSession.update({
        where: { id: session.id },
        data: { status: LabSessionStatus.EXPIRED, completedAt: new Date() },
      }),
      this.prisma.labEvent.create({
        data: {
          sessionId: session.id,
          kind: LabEventKind.EXPIRED,
          payload: { reason: 'ttl_exceeded' },
        },
      }),
    ]);
  }

  /**
   * Recherche et vérifie l'autorisation d'accès d'un utilisateur à sa session.
   */
  async findAndAuthorizeSession(userId: string, labSlug: string, sessionId: string) {
    const normalizedSlug = labSlug.toLowerCase().trim();

    const session = await this.prisma.labSession.findUnique({
      where: { id: sessionId },
      include: { lab: true },
    });

    if (!session || session.lab.slug !== normalizedSlug) {
      throw new NotFoundException(`Session de lab introuvable : ${sessionId}`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Accès refusé à cette session de lab');
    }

    return session;
  }

  private async formatSessionDto(
    session: Parameters<LabSessionFormatterService['formatSessionDto']>[0]
  ): Promise<LabSessionDto> {
    return this.formatterService.formatSessionDto(session);
  }
}
