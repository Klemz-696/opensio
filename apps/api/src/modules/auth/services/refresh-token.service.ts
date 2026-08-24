import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { AuditService } from '../../audit/audit.service';
import type { User } from '@prisma/client';

export interface RotateResult {
  newRawToken: string;
  user: User;
}

export interface CreateRefreshTokenOptions {
  userId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class RefreshTokenService {
  private readonly ttlDays: number;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {
    this.ttlDays = process.env.REFRESH_TOKEN_TTL_DAYS
      ? parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10)
      : 7;
  }

  async createRefreshToken(options: CreateRefreshTokenOptions): Promise<string> {
    const rawToken = this.passwordService.generateSecureToken(32);
    const tokenHash = this.passwordService.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.ttlDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: options.userId,
        tokenHash,
        expiresAt,
        ip: options.ip ?? null,
        userAgent: options.userAgent ?? null,
      },
    });

    return rawToken;
  }

  async rotateRefreshToken(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<RotateResult> {
    if (!rawToken) {
      throw new UnauthorizedException('Jeton de rafraîchissement absent');
    }

    const tokenHash = this.passwordService.hashToken(rawToken);
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide');
    }

    // Détection de réutilisation (D-09) : si le token est déjà révoqué ou déjà remplacé
    if (tokenRecord.revokedAt !== null || tokenRecord.replacedById !== null) {
      // Révocation de TOUTE la chaîne de sessions de l'utilisateur
      await this.revokeAllUserTokens(tokenRecord.userId);

      await this.auditService.logEvent({
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        actorId: tokenRecord.userId,
        targetType: 'user',
        targetId: tokenRecord.userId,
        metadata: {
          compromisedTokenId: tokenRecord.id,
          reason: 'Attempt to reuse an already rotated or revoked token',
        },
        ip,
      });

      throw new UnauthorizedException(
        'Alerte de sécurité : tentative de réutilisation d\'un jeton révoqué. Toutes les sessions actives ont été fermées.',
      );
    }

    // Vérification de l'expiration temporelle
    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Jeton de rafraîchissement expiré');
    }

    // Vérification de l'état du compte utilisateur
    if (tokenRecord.user.status !== 'ACTIVE' || tokenRecord.user.deletedAt !== null) {
      await this.revokeAllUserTokens(tokenRecord.userId);
      throw new UnauthorizedException('Compte utilisateur inactif ou supprimé');
    }

    // Génération du nouveau jeton
    const newRawToken = this.passwordService.generateSecureToken(32);
    const newTokenHash = this.passwordService.hashToken(newRawToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + this.ttlDays);

    // Rotation atomique : création du nouveau token + invalidation de l'ancien
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        },
      });

      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedById: created.id,
        },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { lastLoginAt: new Date() },
      });
    });

    return {
      newRawToken,
      user: tokenRecord.user,
    };
  }

  async revokeRefreshToken(rawToken: string, ip?: string): Promise<void> {
    if (!rawToken) return;

    const tokenHash = this.passwordService.hashToken(rawToken);
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (token && !token.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.logEvent({
        action: 'AUTH_LOGOUT',
        actorId: token.userId,
        targetType: 'user',
        targetId: token.userId,
        ip,
      });
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
