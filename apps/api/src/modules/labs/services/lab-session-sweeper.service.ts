import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LabSessionsService } from './lab-sessions.service';
import { LabSessionStatus } from '@prisma/client';

@Injectable()
export class LabSessionSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LabSessionSweeperService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 5 * 60 * 1000; // Balayage toutes les 5 minutes

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LabSessionsService) private readonly sessionsService: LabSessionsService
  ) {}

  onModuleInit(): void {
    // Balayage immédiat au démarrage puis périodique
    void this.sweepExpiredSessions();
    this.timer = setInterval(() => {
      void this.sweepExpiredSessions();
    }, this.intervalMs);

    // Empêche le timer de bloquer l'arrêt du processus Node en test
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Balaye et nettoie toutes les sessions expirées dont le TTL est dépassé,
   * garantissant la libération des sandboxes sur le disque sans dépendre d'une reconnexion.
   */
  async sweepExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const expiredSessions = await this.prisma.labSession.findMany({
        where: {
          status: LabSessionStatus.RUNNING,
          expiresAt: { lte: now },
        },
        include: { lab: true },
      });

      if (expiredSessions.length === 0) {
        return 0;
      }

      this.logger.log(`🧹 Nettoyage de ${expiredSessions.length} session(s) de lab expirée(s)...`);

      for (const session of expiredSessions) {
        try {
          await this.sessionsService.expireSession(session);
        } catch (err) {
          this.logger.error(`Erreur lors du nettoyage de la session ${session.id}`, err);
        }
      }

      return expiredSessions.length;
    } catch (err) {
      this.logger.error('Erreur lors du balayage des sessions expirées', err);
      return 0;
    }
  }
}
