import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveContentFilePath } from '../../../common/utils/content-path.util';
import { LabSchema, type Lab } from '@opensio/content-schema';
import { parseYamlContent } from '@opensio/content-schema';
import type {
  LabPublicDetailDto,
  LabEditableFileInfo,
  LabHintSummary,
  LabCheckSummary,
} from '../dto/lab-responses.dto';

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Récupère la définition publique d'un lab sans aucune fuite de solution ou d'indices (Zéro-fuite).
   */
  async getPublicLab(slug: string, userId?: string): Promise<LabPublicDetailDto> {
    const normalizedSlug = slug.toLowerCase().trim();

    const labRecord = await this.prisma.lab.findUnique({
      where: { slug: normalizedSlug },
      include: {
        sessions: userId
          ? {
              where: { userId },
              orderBy: { startedAt: 'desc' },
            }
          : false,
      },
    });

    if (!labRecord) {
      throw new NotFoundException(`Lab introuvable : ${slug}`);
    }

    const labDef = this.loadLabDefinition(labRecord.definitionPath);

    // Initial starter files
    const labDir = this.resolveLabDir(labRecord.definitionPath);
    const editableFiles: LabEditableFileInfo[] = [];

    if (labDef.files?.editable) {
      for (const ef of labDef.files.editable) {
        const starterFilePath = path.join(labDir, 'files', ef.path);
        let initialContent = '';
        if (fs.existsSync(starterFilePath)) {
          initialContent = fs.readFileSync(starterFilePath, 'utf-8');
        }
        editableFiles.push({
          path: ef.path,
          description: ef.description,
          initialContent,
        });
      }
    }

    // Résumé sécurisé des indices (indices et coûts en % UNIQUEMENT, ZÉRO texte d'indice)
    const hintsSummary: LabHintSummary[] = (labDef.hints || []).map(
      (h: { cost_percent: number; text: string }, index: number) => ({
        index: index + 1,
        costPercent: h.cost_percent,
      })
    );

    // Résumé public des vérifications (descriptions pédagogiques sans code de test)
    const checksSummary: LabCheckSummary[] = (labDef.validation?.checks || []).map(
      (c: { id: string; required?: boolean; points: number; description?: string }) => ({
        id: c.id,
        required: c.required ?? false,
        points: c.points,
        description: c.description,
      })
    );

    // Enrichissement session active / meilleur score utilisateur
    let activeSessionId: string | null = null;
    let bestScore: number | null = null;
    let isCompleted = false;

    if (labRecord.sessions && labRecord.sessions.length > 0) {
      for (const s of labRecord.sessions) {
        if (s.status === 'RUNNING') {
          activeSessionId = s.id;
        }
        if (s.status === 'PASSED') {
          isCompleted = true;
          if (s.score !== null && (bestScore === null || s.score > bestScore)) {
            bestScore = s.score;
          }
        }
      }
    }

    return {
      id: labRecord.id,
      slug: labRecord.slug,
      title: labDef.title || labRecord.title,
      level: labDef.level || labRecord.level,
      maxScore: labDef.max_score ?? labRecord.maxScore,
      estimatedMinutes: labDef.estimated_minutes ?? labRecord.estimatedMinutes,
      context: labDef.context,
      objectives: labDef.objectives,
      prerequisites: labDef.prerequisites || [],
      topology: labDef.topology || null,
      editableFiles,
      hintsCount: (labDef.hints || []).length,
      hintsSummary,
      scoring: {
        floorPercent: labDef.scoring?.floor_percent ?? 50,
      },
      checksSummary,
      activeSessionId,
      bestScore,
      isCompleted,
    };
  }

  /**
   * Charge la définition complète du lab pour un usage backend interne.
   */
  loadLabDefinition(definitionPath: string): Lab {
    const fullPath = this.resolveContentFilePath(definitionPath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Fichier de définition du lab introuvable: ${definitionPath}`);
    }

    const rawYaml = fs.readFileSync(fullPath, 'utf-8');
    const parsed = parseYamlContent(rawYaml, LabSchema, definitionPath);
    if (!parsed.success) {
      const errorDetails = parsed.errors.map((e) => `${e.field}: ${e.message}`).join(', ');
      throw new BadRequestException(
        `Fichier de définition du lab invalide (${definitionPath}): ${errorDetails}`
      );
    }
    return parsed.data;
  }

  /**
   * Résout le chemin absolu du dossier racine du lab.
   */
  resolveLabDir(definitionPath: string): string {
    const fullPath = this.resolveContentFilePath(definitionPath);
    return path.dirname(fullPath);
  }

  private resolveContentFilePath(definitionPath: string): string {
    return resolveContentFilePath(definitionPath);
  }
}
