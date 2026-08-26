import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AdminUsersService } from '../admin-users.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { PasswordService } from '../../auth/services/password.service';
import type { RefreshTokenService } from '../../auth/services/refresh-token.service';
import type { AuditService } from '../../audit/audit.service';

describe('AdminUsersService (Lot D1)', () => {
  let service: AdminUsersService;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let refreshTokenService: RefreshTokenService;
  let auditService: AuditService;

  const mockAdminUser = {
    id: 'admin-uuid-1',
    email: 'admin@opensio.local',
    displayName: 'Admin Root',
    passwordHash: 'hash-admin',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    deletedAt: null,
  };

  const mockStudentUser = {
    id: 'student-uuid-1',
    email: 'student@opensio.local',
    displayName: 'Student Test',
    passwordHash: 'hash-student',
    role: Role.APPRENANT,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    passwordService = {
      generateTemporaryPassword: vi.fn().mockReturnValue('TempP@ssword123!'),
      validatePolicy: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      hash: vi.fn().mockResolvedValue('hashed-password'),
    } as unknown as PasswordService;

    refreshTokenService = {
      revokeAllUserTokens: vi.fn().mockResolvedValue(1),
    } as unknown as RefreshTokenService;

    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    service = new AdminUsersService(
      prisma,
      passwordService,
      refreshTokenService,
      auditService,
    );
  });

  describe('listUsers', () => {
    it('retourne la liste paginée des utilisateurs', async () => {
      (prisma.user.findMany as any).mockResolvedValue([mockAdminUser, mockStudentUser]);
      (prisma.user.count as any).mockResolvedValue(2);

      const result = await service.listUsers({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].email).toBe(mockAdminUser.email);
    });

    it('applique les filtres de recherche et de rôle', async () => {
      (prisma.user.findMany as any).mockResolvedValue([mockStudentUser]);
      (prisma.user.count as any).mockResolvedValue(1);

      const result = await service.listUsers({
        page: 1,
        limit: 10,
        search: 'student',
        role: Role.APPRENANT,
        status: UserStatus.ACTIVE,
      });

      expect(result.total).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.APPRENANT,
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('createUser', () => {
    it('crée un nouvel utilisateur avec mot de passe temporaire et flag mustChangePassword', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        ...mockStudentUser,
        mustChangePassword: true,
      });

      const result = await service.createUser(
        {
          email: 'new.student@opensio.local',
          displayName: 'New Student',
          role: Role.APPRENANT,
        },
        'admin-uuid-1',
        '127.0.0.1',
      );

      expect(result.user).toBeDefined();
      expect(result.temporaryPassword).toBe('TempP@ssword123!');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new.student@opensio.local',
            mustChangePassword: true,
          }),
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_USER_CREATE',
        }),
      );
    });

    it('rejette la création si l\'adresse email est déjà utilisée', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockStudentUser);

      await expect(
        service.createUser(
          {
            email: mockStudentUser.email,
            displayName: 'Duplicate',
            role: Role.APPRENANT,
          },
          'admin-uuid-1',
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateUser (Gardes de sécurité)', () => {
    it('interdit à un admin de désactiver son propre compte', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockAdminUser);

      await expect(
        service.updateUser(
          mockAdminUser.id,
          { status: UserStatus.DISABLED },
          mockAdminUser.id,
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('interdit à un admin de rétrograder son propre rôle', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockAdminUser);

      await expect(
        service.updateUser(
          mockAdminUser.id,
          { role: Role.APPRENANT },
          mockAdminUser.id,
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('révoque les sessions actives si l\'utilisateur est désactivé', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockStudentUser);
      (prisma.user.update as any).mockResolvedValue({
        ...mockStudentUser,
        status: UserStatus.DISABLED,
      });

      await service.updateUser(
        mockStudentUser.id,
        { status: UserStatus.DISABLED },
        mockAdminUser.id,
        '127.0.0.1',
      );

      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(mockStudentUser.id);
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_USER_UPDATE',
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('réinitialise le mot de passe, active mustChangePassword et révoque les sessions', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(mockStudentUser);
      (prisma.user.update as any).mockResolvedValue({
        ...mockStudentUser,
        mustChangePassword: true,
      });

      const result = await service.resetPassword(
        mockStudentUser.id,
        {},
        mockAdminUser.id,
        '127.0.0.1',
      );

      expect(result.temporaryPassword).toBe('TempP@ssword123!');
      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(mockStudentUser.id);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_USER_PASSWORD_RESET',
        }),
      );
    });

    it('échoue si l\'utilisateur n\'existe pas', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);

      await expect(
        service.resetPassword('unknown-id', {}, mockAdminUser.id, '127.0.0.1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
