import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenService } from '../auth/services/refresh-token.service';
import { AvatarStorageService } from './avatar-storage.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

export interface FullUserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
  mustChangePassword: boolean;
  preferences: unknown;
  aiPreference?: {
    preferredModel: string | null;
    freeMode: boolean;
  } | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvatarStorageService) private readonly avatarStorage: AvatarStorageService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(RefreshTokenService) private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async getProfile(userId: string): Promise<FullUserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { aiPreference: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      preferences: user.preferences,
      aiPreference: user.aiPreference
        ? {
            preferredModel: user.aiPreference.preferredModel,
            freeMode: user.aiPreference.freeMode,
          }
        : null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ip?: string,
  ): Promise<FullUserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      },
      include: { aiPreference: true },
    });

    await this.auditService.logEvent({
      action: 'USER_PROFILE_UPDATE',
      actorId: userId,
      targetType: 'user',
      targetId: userId,
      metadata: { changes: dto },
      ip,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      bio: updatedUser.bio,
      role: updatedUser.role,
      status: updatedUser.status,
      mustChangePassword: updatedUser.mustChangePassword,
      preferences: updatedUser.preferences,
      aiPreference: updatedUser.aiPreference
        ? {
            preferredModel: updatedUser.aiPreference.preferredModel,
            freeMode: updatedUser.aiPreference.freeMode,
          }
        : null,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt,
    };
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    ip?: string,
  ): Promise<{ avatarUrl: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    const oldAvatarUrl = user.avatarUrl;
    const newFilename = await this.avatarStorage.saveAvatar(userId, file);
    const newAvatarUrl = `/api/v1/users/avatar/${newFilename}`;

    if (oldAvatarUrl) {
      await this.avatarStorage.deleteAvatarByUrl(oldAvatarUrl);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: newAvatarUrl },
    });

    await this.auditService.logEvent({
      action: 'USER_AVATAR_UPLOAD',
      actorId: userId,
      targetType: 'user',
      targetId: userId,
      metadata: { avatarUrl: newAvatarUrl },
      ip,
    });

    return { avatarUrl: newAvatarUrl };
  }

  async deleteAvatar(
    userId: string,
    ip?: string,
  ): Promise<{ avatarUrl: null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    if (user.avatarUrl) {
      await this.avatarStorage.deleteAvatarByUrl(user.avatarUrl);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    await this.auditService.logEvent({
      action: 'USER_AVATAR_DELETE',
      actorId: userId,
      targetType: 'user',
      targetId: userId,
      ip,
    });

    return { avatarUrl: null };
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { aiPreference: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    return {
      preferences: (user.preferences as Record<string, unknown>) || {},
      aiPreference: user.aiPreference
        ? {
            preferredModel: user.aiPreference.preferredModel,
            freeMode: user.aiPreference.freeMode,
          }
        : null,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
    ip?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    const currentPreferences = (user.preferences as Record<string, unknown>) || {};
    const newPreferences = {
      ...currentPreferences,
      ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
      ...(dto.soundEffects !== undefined ? { soundEffects: dto.soundEffects } : {}),
    };

    if (dto.aiFreeMode !== undefined || dto.aiPreferredModel !== undefined) {
      await this.prisma.userAiPreference.upsert({
        where: { userId },
        create: {
          userId,
          freeMode: dto.aiFreeMode ?? false,
          preferredModel: dto.aiPreferredModel,
        },
        update: {
          ...(dto.aiFreeMode !== undefined ? { freeMode: dto.aiFreeMode } : {}),
          ...(dto.aiPreferredModel !== undefined ? { preferredModel: dto.aiPreferredModel } : {}),
        },
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: newPreferences },
      include: { aiPreference: true },
    });

    await this.auditService.logEvent({
      action: 'USER_PREFERENCES_UPDATE',
      actorId: userId,
      targetType: 'user',
      targetId: userId,
      metadata: { preferences: newPreferences, aiPreference: dto },
      ip,
    });

    return {
      preferences: updatedUser.preferences,
      aiPreference: updatedUser.aiPreference
        ? {
            preferredModel: updatedUser.aiPreference.preferredModel,
            freeMode: updatedUser.aiPreference.freeMode,
          }
        : null,
    };
  }

  async deleteAccount(
    userId: string,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // RGPD : suppression physique de l'avatar sur le disque
    if (user.avatarUrl) {
      await this.avatarStorage.deleteAvatarByUrl(user.avatarUrl);
    }

    // Révocation de toutes les sessions actives
    await this.refreshTokenService.revokeAllUserTokens(userId);

    // Enregistrement d'audit avant suppression de la ligne
    await this.auditService.logEvent({
      action: 'USER_ACCOUNT_DELETE_RGPD',
      actorId: userId,
      targetType: 'user',
      targetId: userId,
      metadata: { email: user.email },
      ip,
    });

    // Suppression en cascade dans PostgreSQL
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message: 'Compte et données associées supprimés avec succès conformément au RGPD.',
    };
  }
}
