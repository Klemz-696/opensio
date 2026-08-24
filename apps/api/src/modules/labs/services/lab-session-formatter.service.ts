import { Inject, Injectable } from '@nestjs/common';
import { Prisma, LabSessionStatus } from '@prisma/client';
import { LabsService } from './labs.service';
import {
  LAB_RUNNER_TOKEN,
  type LabRunner,
  type LabSessionContext,
} from '../runners/lab-runner.interface';
import type { LabSessionDto, LabUnlockedHintDto } from '../dto/lab-responses.dto';

@Injectable()
export class LabSessionFormatterService {
  constructor(
    @Inject(LabsService) private readonly labsService: LabsService,
    @Inject(LAB_RUNNER_TOKEN) private readonly labRunner: LabRunner
  ) {}

  /**
   * Formate une session Prisma en DTO complet pour l'API et le frontend.
   */
  async formatSessionDto(session: {
    id: string;
    labId: string;
    userId: string;
    status: LabSessionStatus;
    score: number | null;
    hintsUsed: number;
    startedAt: Date;
    expiresAt: Date;
    completedAt: Date | null;
    runtimeRef: Prisma.JsonValue;
    lastResult: Prisma.JsonValue;
    lab: { id: string; slug: string; title: string; level: string; definitionPath: string };
  }): Promise<LabSessionDto> {
    const labDef = this.labsService.loadLabDefinition(session.lab.definitionPath);
    const totalHints = (labDef.hints || []).length;

    const unlockedHints: LabUnlockedHintDto[] = [];
    for (let i = 0; i < session.hintsUsed && i < totalHints; i++) {
      unlockedHints.push({
        index: i + 1,
        costPercent: labDef.hints[i].cost_percent,
        text: labDef.hints[i].text,
      });
    }

    const editablePaths = (labDef.files?.editable || []).map((f) => f.path);
    const context: LabSessionContext = {
      sessionId: session.id,
      labSlug: session.lab.slug,
      labLevel: session.lab.level,
      definitionPath: session.lab.definitionPath,
      runtimeRef: session.runtimeRef as Record<string, unknown> | null,
    };

    const files = await this.labRunner.getFiles(context, editablePaths);

    const statusMap: Record<LabSessionStatus, 'running' | 'passed' | 'failed' | 'expired' | 'cleaned'> = {
      [LabSessionStatus.RUNNING]: 'running',
      [LabSessionStatus.PASSED]: 'passed',
      [LabSessionStatus.FAILED]: 'failed',
      [LabSessionStatus.EXPIRED]: 'expired',
      [LabSessionStatus.CLEANED]: 'cleaned',
    };

    return {
      id: session.id,
      labId: session.labId,
      labSlug: session.lab.slug,
      labTitle: session.lab.title,
      labLevel: session.lab.level,
      userId: session.userId,
      status: statusMap[session.status],
      score: session.score,
      hintsUsed: session.hintsUsed,
      totalHints,
      unlockedHints,
      files,
      lastResult: session.lastResult as unknown as LabSessionDto['lastResult'],
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    };
  }
}
