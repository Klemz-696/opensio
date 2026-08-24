import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma, LabSessionStatus, LabEventKind } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { LabsService } from './labs.service';
import { LabSessionsService } from './lab-sessions.service';
import { LabScoringService } from './lab-scoring.service';
import {
  LAB_RUNNER_TOKEN,
  type LabRunner,
  type LabSessionContext,
  type EditedFile,
} from '../runners/lab-runner.interface';
import type { LabVerdictDto } from '../dto/lab-responses.dto';

@Injectable()
export class LabValidationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(LabsService) private readonly labsService: LabsService,
    @Inject(LabSessionsService) private readonly sessionsService: LabSessionsService,
    @Inject(LabScoringService) private readonly scoringService: LabScoringService,
    @Inject(LAB_RUNNER_TOKEN) private readonly labRunner: LabRunner
  ) {}

  /**
   * Valide le travail d'une session de lab côté serveur (Zéro-fuite).
   */
  async validateSession(
    userId: string,
    labSlug: string,
    sessionId: string,
    files?: EditedFile[],
    ip?: string | null
  ): Promise<LabVerdictDto> {
    const session = await this.sessionsService.findAndAuthorizeSession(userId, labSlug, sessionId);

    if (session.status !== LabSessionStatus.RUNNING) {
      throw new BadRequestException('La session de lab n’est pas en cours d’exécution');
    }

    if (session.expiresAt <= new Date()) {
      await this.sessionsService.expireSession(session);
      throw new BadRequestException('La session de lab a expiré');
    }

    const labDef = this.labsService.loadLabDefinition(session.lab.definitionPath);

    // Si des fichiers sont fournis directement à la validation, les vérifier et les sauvegarder
    if (files && files.length > 0) {
      await this.sessionsService.saveFiles(userId, labSlug, sessionId, files);
    }

    const context: LabSessionContext = {
      sessionId: session.id,
      labSlug: session.lab.slug,
      labLevel: session.lab.level,
      definitionPath: session.lab.definitionPath,
      runtimeRef: session.runtimeRef as Record<string, unknown> | null,
    };

    // Exécution du validateur confiné par le runner
    const rawVerdict = await this.labRunner.validate(context);

    // Calcul de la note avec pénalités d'indices (RM-05) et contrôles obligatoires (RM-04)
    const checkDefs = (labDef.validation?.checks || []).map((c) => ({
      id: c.id,
      required: c.required,
      points: c.points,
    }));

    const scoreResult = this.scoringService.calculateScore(
      rawVerdict.checks,
      checkDefs,
      labDef.hints || [],
      session.hintsUsed,
      labDef.max_score ?? session.lab.maxScore,
      labDef.scoring?.floor_percent ?? 50
    );

    const now = new Date();
    const checksResult = rawVerdict.checks.map((c) => ({
      id: c.id,
      passed: c.passed,
      points: c.points,
      message: c.message,
    }));

    const finalVerdict: LabVerdictDto = {
      passed: scoreResult.passed,
      score: scoreResult.finalScore,
      status: scoreResult.passed ? 'passed' : 'running',
      checks: checksResult,
    };

    if (scoreResult.passed) {
      // Transition vers PASSED
      await this.prisma.labSession.update({
        where: { id: session.id },
        data: {
          status: LabSessionStatus.PASSED,
          score: scoreResult.finalScore,
          completedAt: now,
          lastResult: finalVerdict as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.labEvent.create({
        data: {
          sessionId: session.id,
          kind: LabEventKind.PASSED,
          payload: {
            score: scoreResult.finalScore,
            rawScore: scoreResult.rawScore,
            penaltyPercent: scoreResult.penaltyPercent,
            checks: checksResult,
          },
        },
      });

      await this.prisma.activityEvent.create({
        data: {
          userId,
          kind: 'LAB_COMPLETED',
          entityType: 'lab',
          entityId: session.lab.id,
          metadata: {
            labSlug: session.lab.slug,
            labTitle: session.lab.title,
            score: scoreResult.finalScore,
            passed: true,
            sessionId: session.id,
          },
        },
      });

      await this.auditService.logEvent({
        action: 'LAB_SESSION_VALIDATED',
        actorId: userId,
        targetType: 'lab_session',
        targetId: session.id,
        metadata: {
          labSlug: session.lab.slug,
          score: scoreResult.finalScore,
          passed: true,
        },
        ip: ip ?? null,
      });
    } else {
      // En cas d'échec, la session reste RUNNING pour permettre de nouvelles tentatives
      await this.prisma.labSession.update({
        where: { id: session.id },
        data: {
          lastResult: finalVerdict as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.labEvent.create({
        data: {
          sessionId: session.id,
          kind: LabEventKind.VALIDATION_RUN,
          payload: {
            passed: false,
            score: scoreResult.finalScore,
            checks: checksResult,
          },
        },
      });

      await this.auditService.logEvent({
        action: 'LAB_SESSION_VALIDATION_FAILED',
        actorId: userId,
        targetType: 'lab_session',
        targetId: session.id,
        metadata: {
          labSlug: session.lab.slug,
          score: scoreResult.finalScore,
          passed: false,
        },
        ip: ip ?? null,
      });
    }

    return finalVerdict;
  }
}
