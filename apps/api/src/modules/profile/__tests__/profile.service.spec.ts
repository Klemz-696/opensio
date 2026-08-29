import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from '../profile.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus, Role } from '@prisma/client';

describe('ProfileService', () => {
  let service: ProfileService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAvatarStorage: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAudit: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRefreshTokenService: any;

  const mockUser = {
    id: 'user-123',
    email: 'student@opensio.local',
    displayName: 'Étudiant Test',
    avatarUrl: '/api/v1/users/avatar/avatar_user123_1111_aaaa.png',
    bio: 'Passionné de réseaux et cybersécurité',
    role: Role.APPRENANT,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    preferences: { theme: 'dark', soundEffects: true },
    aiPreference: {
      preferredModel: 'deepseek-r1:14b',
      freeMode: false,
    },
    createdAt: new Date('2026-08-24'),
    lastLoginAt: new Date('2026-08-26'),
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ ...mockUser }),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({
          ...mockUser,
          ...data,
        })),
        delete: vi.fn().mockResolvedValue({ ...mockUser }),
      },
      userAiPreference: {
        upsert: vi.fn().mockResolvedValue({
          userId: 'user-123',
          preferredModel: 'mistral:7b',
          freeMode: true,
        }),
      },
    };

    mockAvatarStorage = {
      saveAvatar: vi.fn().mockResolvedValue('avatar_user123_2222_bbbb.png'),
      deleteAvatarByUrl: vi.fn().mockResolvedValue(true),
      deleteAvatarFile: vi.fn().mockResolvedValue(true),
    };

    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({ id: 'audit-123' }),
    };

    mockRefreshTokenService = {
      revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
    };

    service = new ProfileService(
      mockPrisma,
      mockAvatarStorage,
      mockAudit,
      mockRefreshTokenService,
    );
  });

  describe('getProfile', () => {
    it('devrait retourner le profil complet avec préférences et IA', async () => {
      const result = await service.getProfile('user-123');

      expect(result.id).toBe('user-123');
      expect(result.displayName).toBe('Étudiant Test');
      expect(result.bio).toBe('Passionné de réseaux et cybersécurité');
      expect(result.avatarUrl).toBe('/api/v1/users/avatar/avatar_user123_1111_aaaa.png');
      expect(result.aiPreference?.preferredModel).toBe('deepseek-r1:14b');
    });

    it('devrait lever UnauthorizedException si l\'utilisateur est inactif ou introuvable', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('devrait mettre à jour le nom d\'affichage et la bio et enregistrer un audit log', async () => {
      const result = await service.updateProfile('user-123', {
        displayName: 'Nouveau Nom',
        bio: 'Nouvelle bio mise à jour',
      });

      expect(result.displayName).toBe('Nouveau Nom');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          displayName: 'Nouveau Nom',
          bio: 'Nouvelle bio mise à jour',
        },
        include: { aiPreference: true },
      });

      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PROFILE_UPDATE',
          actorId: 'user-123',
        }),
      );
    });
  });

  describe('uploadAvatar', () => {
    it('devrait sauvegarder le nouvel avatar, supprimer l\'ancien et mettre à jour la base', async () => {
      const mockFile = { buffer: Buffer.from('img') } as Express.Multer.File;

      const result = await service.uploadAvatar('user-123', mockFile);

      expect(mockAvatarStorage.saveAvatar).toHaveBeenCalledWith('user-123', mockFile);
      expect(mockAvatarStorage.deleteAvatarByUrl).toHaveBeenCalledWith(
        mockUser.avatarUrl,
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatarUrl: '/api/v1/users/avatar/avatar_user123_2222_bbbb.png' },
      });
      expect(result.avatarUrl).toBe('/api/v1/users/avatar/avatar_user123_2222_bbbb.png');
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_AVATAR_UPLOAD' }),
      );
    });
  });

  describe('deleteAvatar', () => {
    it('devrait supprimer le fichier d\'avatar et réinitialiser avatarUrl à null', async () => {
      const result = await service.deleteAvatar('user-123');

      expect(mockAvatarStorage.deleteAvatarByUrl).toHaveBeenCalledWith(
        mockUser.avatarUrl,
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatarUrl: null },
      });
      expect(result.avatarUrl).toBeNull();
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_AVATAR_DELETE' }),
      );
    });
  });

  describe('updatePreferences', () => {
    it('devrait fusionner les préférences et mettre à jour UserAiPreference', async () => {
      const result = await service.updatePreferences('user-123', {
        theme: 'light',
        aiFreeMode: true,
        aiPreferredModel: 'mistral:7b',
      });

      expect(result.preferences).toBeDefined();
      expect(mockPrisma.userAiPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: {
          userId: 'user-123',
          freeMode: true,
          preferredModel: 'mistral:7b',
        },
        update: {
          freeMode: true,
          preferredModel: 'mistral:7b',
        },
      });

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_PREFERENCES_UPDATE' }),
      );
    });
  });

  describe('deleteAccount (RGPD)', () => {
    it('devrait supprimer l\'avatar sur le disque, révoquer les sessions et supprimer le compte en base', async () => {
      const result = await service.deleteAccount('user-123');

      expect(mockAvatarStorage.deleteAvatarByUrl).toHaveBeenCalledWith(
        mockUser.avatarUrl,
      );
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_ACCOUNT_DELETE_RGPD',
          actorId: 'user-123',
        }),
      );
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result.success).toBe(true);
    });
  });
});
