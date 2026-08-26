import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { RefreshTokenService } from '../../auth/services/refresh-token.service';
import { AuditService } from '../../audit/audit.service';
import { AvatarStorageService } from '../avatar-storage.service';
import { ProfileService } from '../profile.service';
import { ProfileController } from '../profile.controller';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';

const TEST_SECRET = 'c'.repeat(64);

const mockReq = {
  ip: '127.0.0.1',
  headers: {},
  socket: { remoteAddress: '127.0.0.1' },
} as unknown as Request;

describe.skipIf(!process.env.DATABASE_URL)('Profile Module — Tests d\'Intégration PostgreSQL & RGPD (Lot D2)', () => {
  let prisma: PrismaService;
  let isDbConnected = false;
  let profileService: ProfileService;
  let profileController: ProfileController;
  let avatarStorage: AvatarStorageService;
  let passwordService: PasswordService;
  let refreshTokenService: RefreshTokenService;
  let auditService: AuditService;

  const testUserEmail = 'user.d2.test@opensio.local';
  const testPassword = 'InitialSecureP@ssword123!';
  let testUser: { id: string; email: string; displayName: string; role: Role };
  let authUser: AuthenticatedUser;
  let tempUploadDir: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    tempUploadDir = path.join(process.cwd(), 'tmp_e2e_uploads', `test_${Date.now()}`);
    process.env.AVATAR_UPLOAD_DIR = tempUploadDir;

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
      avatarStorage = new AvatarStorageService();
      profileService = new ProfileService(prisma, avatarStorage, auditService, refreshTokenService);
      profileController = new ProfileController(profileService, avatarStorage);

      // Nettoyage préalable
      const existing = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (existing) {
        await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
        await prisma.userAiPreference.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }

      const passwordHash = await passwordService.hash(testPassword);
      testUser = await prisma.user.create({
        data: {
          email: testUserEmail,
          displayName: 'Étudiant D2 Test',
          passwordHash,
          role: Role.APPRENANT,
          status: UserStatus.ACTIVE,
        },
      });

      authUser = {
        id: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
        role: testUser.role,
      };
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (isDbConnected && prisma) {
      const existing = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (existing) {
        await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
        await prisma.userAiPreference.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
      await prisma.$disconnect();
    }

    if (tempUploadDir && fs.existsSync(tempUploadDir)) {
      await fs.promises.rm(tempUploadDir, { recursive: true, force: true });
    }
  });

  it('1. GET /api/v1/profile — devrait récupérer le profil initial', async () => {
    if (!isDbConnected) return;

    const profile = await profileController.getProfile(authUser);

    expect(profile.id).toBe(testUser.id);
    expect(profile.email).toBe(testUserEmail);
    expect(profile.displayName).toBe('Étudiant D2 Test');
    expect(profile.avatarUrl).toBeNull();
    expect(profile.bio).toBeNull();
  });

  it('2. PATCH /api/v1/profile — devrait mettre à jour nom et bio', async () => {
    if (!isDbConnected) return;

    const updated = await profileController.updateProfile(
      authUser,
      {
        displayName: 'Étudiant D2 Modifié',
        bio: 'Bio spécialisée en réseaux CISCO et sécurité.',
      },
      mockReq,
    );

    expect(updated.displayName).toBe('Étudiant D2 Modifié');
    expect(updated.bio).toBe('Bio spécialisée en réseaux CISCO et sécurité.');

    const inDb = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(inDb?.displayName).toBe('Étudiant D2 Modifié');
    expect(inDb?.bio).toBe('Bio spécialisée en réseaux CISCO et sécurité.');
  });

  it('3. POST /api/v1/profile/avatar — upload d\'un avatar valide et mise à jour URL', async () => {
    if (!isDbConnected) return;

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mockFile: Express.Multer.File = {
      buffer: pngBuffer,
      size: pngBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'avatar.png',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const res = await profileController.uploadAvatar(authUser, mockFile, mockReq);

    expect(res.avatarUrl).toMatch(/^\/api\/v1\/users\/avatar\/avatar_[a-zA-Z0-9_-]+\.png$/);

    const inDb = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(inDb?.avatarUrl).toBe(res.avatarUrl);

    const filename = path.basename(res.avatarUrl);
    expect(fs.existsSync(path.join(tempUploadDir, filename))).toBe(true);
  });

  it('4. PATCH /api/v1/profile/preferences — mise à jour des préférences UI et IA', async () => {
    if (!isDbConnected) return;

    const res = await profileController.updatePreferences(
      authUser,
      {
        theme: 'dark',
        soundEffects: true,
        aiFreeMode: true,
        aiPreferredModel: 'qwen2.5-coder:14b',
      },
      mockReq,
    );

    expect(res.preferences).toEqual({ theme: 'dark', soundEffects: true });
    expect(res.aiPreference?.freeMode).toBe(true);
    expect(res.aiPreference?.preferredModel).toBe('qwen2.5-coder:14b');
  });

  it('5. DELETE /api/v1/profile/avatar — suppression de l\'avatar', async () => {
    if (!isDbConnected) return;

    const beforeDelete = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(beforeDelete?.avatarUrl).not.toBeNull();
    const filename = path.basename(beforeDelete!.avatarUrl!);

    const res = await profileController.deleteAvatar(authUser, mockReq);
    expect(res.avatarUrl).toBeNull();

    const afterDelete = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(afterDelete?.avatarUrl).toBeNull();
    expect(fs.existsSync(path.join(tempUploadDir, filename))).toBe(false);
  });

  it('6. DELETE /api/v1/profile — suppression de compte RGPD avec nettoyage de l\'avatar sur le disque', async () => {
    if (!isDbConnected) return;

    // 1. Re-uploader un avatar pour tester la suppression physique lors de la suppression de compte
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
    const mockFile: Express.Multer.File = {
      buffer: pngBuffer,
      size: pngBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'avatar_to_delete.png',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const uploadRes = await profileController.uploadAvatar(authUser, mockFile, mockReq);
    const filename = path.basename(uploadRes.avatarUrl);
    expect(fs.existsSync(path.join(tempUploadDir, filename))).toBe(true);

    // 2. Suppression de compte RGPD
    const deleteRes = await profileController.deleteAccount(authUser, mockReq);
    expect(deleteRes.success).toBe(true);

    // 3. Vérifier que l'avatar est détruit sur le disque
    expect(fs.existsSync(path.join(tempUploadDir, filename))).toBe(false);

    // 4. Vérifier que l'utilisateur n'existe plus en base
    const userInDb = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userInDb).toBeNull();
  });
});
