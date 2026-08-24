import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEventParams {
  action: string;
  actorId?: string | null;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async logEvent(params: AuditEventParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          actorId: params.actorId ?? null,
          targetType: params.targetType,
          targetId: params.targetId ?? null,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          ip: params.ip ?? null,
        },
      });
    } catch (err) {
      // Un échec d'écriture d'audit ne doit pas faire crasher l'authentification mais doit être loggé
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec d'enregistrement du log d'audit [${params.action}]: ${message}`);
    }
  }
}
