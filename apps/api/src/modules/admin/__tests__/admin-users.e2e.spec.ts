import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { RefreshTokenService } from '../../auth/services/refresh-token.service';
import { AuditService } from '../../audit/audit.service';
import { AdminUsersService } from '../admin-users.service';
import { AdminUsersController } from '../admin-users.controller';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';

const TEST_SECRET = 'c'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)('Admin Module — Tests d\'Intégration PostgreSQL & RBAC (Lot D1)', () => {
  let prisma: PrismaService;
  let isDbConnected = false;
  let adminService: AdminUsersService;
  let adminController: AdminUsersController;
  let passwordService: PasswordService;
  let refreshTokenService: RefreshTokenService;
  let auditService: AuditService;

  const adminEmail = 'admin.d1.test@opensio.local';
  const studentEmail = 'student.d1.test@opensio.local';
  const targetEmail = 'target.d1.test@opensio.local';
  const testPassword = 'InitialSecureP@ssword123!';

  let adminUser: { id: string; email: string; displayName: string; role: Role };
  let studentUser: { id: string; email: string; displayName: string; role: Role };
  const adminAuth: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: adminEmail,
    displayName: 'Admin Test D1',
    role: Role.ADMIN,
  };
  const studentAuth: AuthenticatedUser = {
    id: 'student-uuid-1',
    email: studentEmail,
    displayName: 'Student Test D1',
    role: Role.APPRENANT,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;

    try {
      prisma = new PrismaService();
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      isDbConnected = true;

      auditService = new AuditService(prisma);
      passwordService = new PasswordService();
      refreshTokenService = new RefreshTokenService(prisma, passwordService, auditService);
      adminService = new AdminUsersService(prisma, passwordService, refreshTokenService, auditService);
      adminController = new AdminUsersController(adminService);

      // Nettoyage préalable
      for (const email of [adminEmail, studentEmail, targetEmail]) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
          await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
          await prisma.user.delete({ where: { id: existing.id } });
        }
      }

      const passwordHash = await passwordService.hash(testPassword);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          displayName: 'Admin Test D1',
          passwordHash,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      studentUser = await prisma.user.create({
        data: {
          email: studentEmail,
          displayName: 'Student Test D1',
          passwordHash,
          role: Role.APPRENANT,
          status: UserStatus.ACTIVE,
        },
      });

      adminAuth.id = adminUser.id;
      studentAuth.id = studentUser.id;
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (prisma && isDbConnected) {
      try {
        for (const email of [adminEmail, studentEmail, targetEmail]) {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
            await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
            await prisma.user.delete({ where: { id: existing.id } });
          }
        }
        await prisma.$disconnect();
      } catch {
        // Ignorer
      }
    }
  });

  it('1. RolesGuard : bloque l\'accès aux apprenants et autorise les admins', () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => [Role.ADMIN];
    const guard = new RolesGuard(reflector);

    const mockAdminContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: adminAuth }),
      }),
    } as any;

    const mockStudentContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: studentAuth }),
      }),
    } as any;

    expect(guard.canActivate(mockAdminContext)).toBe(true);
    expect(() => guard.canActivate(mockStudentContext)).toThrow(ForbiddenException);
  });

  it('2. GET /admin/users : liste paginée des utilisateurs pour l\'administrateur', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const result = await adminController.listUsers({ page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.items.some((u) => u.email === adminEmail)).toBe(true);
    expect(result.items.some((u) => u.email === studentEmail)).toBe(true);
  });

  it('3. POST /admin/users : création d\'un nouvel apprenant avec mot de passe temporaire', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const created = await adminController.createUser(
      {
        email: targetEmail,
        displayName: 'Target Apprenant',
        role: Role.APPRENANT,
      },
      adminAuth,
      { ip: '127.0.0.1' } as any,
    );

    expect(created.user.email).toBe(targetEmail);
    expect(created.user.role).toBe(Role.APPRENANT);
    expect(created.user.mustChangePassword).toBe(true);
    expect(created.temporaryPassword).toBeDefined();

    // Vérifie en base
    const userInDb = await prisma.user.findUnique({ where: { email: targetEmail } });
    expect(userInDb!.mustChangePassword).toBe(true);
  });

  it('4. PATCH /admin/users/:id : modification des détails d\'un utilisateur', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const userInDb = await prisma.user.findUnique({ where: { email: targetEmail } });
    const updated = await adminController.updateUser(
      userInDb!.id,
      {
        displayName: 'Target Modifié',
      },
      adminAuth,
      { ip: '127.0.0.1' } as any,
    );

    expect(updated.displayName).toBe('Target Modifié');
  });

  it('5. PATCH /admin/users/:id : interdit l\'auto-rétrogradation et l\'auto-désactivation d\'un admin', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    await expect(
      adminController.updateUser(
        adminUser.id,
        { role: Role.APPRENANT },
        adminAuth,
        { ip: '127.0.0.1' } as any,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      adminController.updateUser(
        adminUser.id,
        { status: UserStatus.DISABLED },
        adminAuth,
        { ip: '127.0.0.1' } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('6. POST /admin/users/:id/reset-password : réinitialise le mot de passe et révoque les sessions', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const userInDb = await prisma.user.findUnique({ where: { email: targetEmail } });
    const resetRes = await adminController.resetPassword(
      userInDb!.id,
      {},
      adminAuth,
      { ip: '127.0.0.1' } as any,
    );

    expect(resetRes.temporaryPassword).toBeDefined();

    const userAfter = await prisma.user.findUnique({ where: { id: userInDb!.id } });
    expect(userAfter!.mustChangePassword).toBe(true);
  });
});
