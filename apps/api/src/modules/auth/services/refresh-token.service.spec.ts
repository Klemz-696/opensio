import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordService } from './password.service';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let auditService: AuditService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@opensio.local',
    displayName: 'Test User',
    passwordHash: 'hash',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    } as unknown as PrismaService;

    passwordService = new PasswordService();
    auditService = new AuditService(prisma);
    service = new RefreshTokenService(prisma, passwordService, auditService);
  });

  describe('createRefreshToken', () => {
    it('génère un token 256 bits, le hache en SHA-256 et le persiste', async () => {
      const rawToken = await service.createRefreshToken({
        userId: mockUser.id,
        ip: '127.0.0.1',
        userAgent: 'Vitest Agent',
      });

      expect(rawToken).toBeDefined();
      expect(rawToken).toHaveLength(64); // 32 octets en hex = 64 caractères
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            tokenHash: passwordService.hashToken(rawToken),
            ip: '127.0.0.1',
            userAgent: 'Vitest Agent',
          }),
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('effectue la rotation d\'un token valide et renvoie un nouveau token', async () => {
      const rawOldToken = 'old-raw-token-value-12345678901234567890123456789012';
      const oldHash = passwordService.hashToken(rawOldToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const existingRecord = {
        id: 'token-rec-1',
        userId: mockUser.id,
        tokenHash: oldHash,
        expiresAt,
        createdAt: new Date(),
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ip: null,
        user: mockUser,
      };

      vi.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(existingRecord);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-rec-2',
      } as never);

      const result = await service.rotateRefreshToken(rawOldToken, '127.0.0.1');

      expect(result.newRawToken).toBeDefined();
      expect(result.newRawToken).not.toBe(rawOldToken);
      expect(result.user.id).toBe(mockUser.id);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-rec-1' },
          data: expect.objectContaining({
            replacedById: 'token-rec-2',
          }),
        }),
      );
    });

    it('rejette et révoque TOUTE la chaîne en cas de détection de réutilisation (D-09)', async () => {
      const rawCompromisedToken = 'compromised-token-value';
      const compromisedHash = passwordService.hashToken(rawCompromisedToken);

      // Token déjà révoqué/remplacé dans le passé
      const alreadyReplacedRecord = {
        id: 'token-rec-compromised',
        userId: mockUser.id,
        tokenHash: compromisedHash,
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        revokedAt: new Date(),
        replacedById: 'token-rec-next',
        userAgent: null,
        ip: null,
        user: mockUser,
      };

      vi.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(alreadyReplacedRecord);
      const revokeAllSpy = vi.spyOn(prisma.refreshToken, 'updateMany');
      const auditLogSpy = vi.spyOn(prisma.auditLog, 'create');

      await expect(
        service.rotateRefreshToken(rawCompromisedToken, '192.168.1.100'),
      ).rejects.toThrow('tentative de réutilisation d\'un jeton révoqué');

      // Doit avoir révoqué toutes les sessions actives de l'utilisateur
      expect(revokeAllSpy).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          revokedAt: null,
        },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      });

      // Doit avoir consigné un événement d'audit de sécurité
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AUTH_REFRESH_REUSE_DETECTED',
            actorId: mockUser.id,
            ip: '192.168.1.100',
          }),
        }),
      );
    });

    it('rejette un jeton expiré et le marque comme révoqué', async () => {
      const rawExpiredToken = 'expired-raw-token';
      const expiredHash = passwordService.hashToken(rawExpiredToken);

      const expiredRecord = {
        id: 'token-rec-expired',
        userId: mockUser.id,
        tokenHash: expiredHash,
        expiresAt: new Date(Date.now() - 10000), // expiré dans le passé
        createdAt: new Date(),
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ip: null,
        user: mockUser,
      };

      vi.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(expiredRecord);

      await expect(service.rotateRefreshToken(rawExpiredToken)).rejects.toThrow(
        'Jeton de rafraîchissement expiré',
      );

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-rec-expired' },
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
