import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { AuditService } from '../../audit/audit.service';
import type { ForgotPasswordDto } from '../dto/forgot-password.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async forgotPassword(
    dto: ForgotPasswordDto,
    ip?: string,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      return {
        message: 'Si cette adresse est associée à un compte actif, des instructions ont été générées.',
      };
    }

    const rawToken = this.passwordService.generateSecureToken(32);
    const tokenHash = this.passwordService.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 heure de validité

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.auditService.logEvent({
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      actorId: user.id,
      targetType: 'user',
      targetId: user.id,
      ip,
    });

    this.logger.log(`[Demande Réinitialisation Mot de passe] Utilisateur ${user.email}`);

    return {
      message: 'Si cette adresse est associée à un compte actif, des instructions ont été générées.',
      resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const policy = this.passwordService.validatePolicy(dto.newPassword);
    if (!policy.valid) {
      throw new BadRequestException({
        message: 'Mot de passe non conforme à la politique de sécurité.',
        errors: policy.errors,
      });
    }

    const tokenHash = this.passwordService.hashToken(dto.token);
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Jeton de réinitialisation invalide ou expiré.');
    }

    const newPasswordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Révocation de toutes les sessions actives de l'utilisateur
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.auditService.logEvent({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      actorId: resetRecord.userId,
      targetType: 'user',
      targetId: resetRecord.userId,
      ip,
    });

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès.',
    };
  }
}
