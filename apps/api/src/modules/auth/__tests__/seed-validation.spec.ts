import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as argon2 from 'argon2';
import { seedDatabase } from '../../../../prisma/seed';
import type { PrismaClient } from '@prisma/client';

describe('Seed Password Policy Validation (D-09)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        upsert: vi.fn().mockImplementation((args) => Promise.resolve({
          id: 'mock-uuid',
          email: args.where.email,
          displayName: args.create.displayName,
          role: args.create.role,
          status: args.create.status,
        })),
      },
    };
  });

  it('devrait rejeter un SEED_ADMIN_PASSWORD trop court (< 12 caractères)', async () => {
    const badEnv = {
      SEED_ADMIN_PASSWORD: 'Short1!',
      SEED_ADMIN_EMAIL: 'admin@opensio.local',
    };

    await expect(seedDatabase(mockPrisma as unknown as PrismaClient, { env: badEnv }))
      .rejects.toThrow(/SEED_ADMIN_PASSWORD invalide selon la politique D-09/);
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('devrait rejeter un SEED_ADMIN_PASSWORD ne respectant pas les 3 classes de caractères', async () => {
    const badEnv = {
      SEED_ADMIN_PASSWORD: 'onlylowercasewithoutnumbersorspecials',
      SEED_ADMIN_EMAIL: 'admin@opensio.local',
    };

    await expect(seedDatabase(mockPrisma as unknown as PrismaClient, { env: badEnv }))
      .rejects.toThrow(/SEED_ADMIN_PASSWORD invalide selon la politique D-09/);
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  it('devrait accepter un SEED_ADMIN_PASSWORD conforme et mettre à jour passwordHash dans update et create', async () => {
    const validPassword = 'AdminSecurePass2026!';
    const validEnv = {
      SEED_ADMIN_PASSWORD: validPassword,
      SEED_ADMIN_EMAIL: 'admin@opensio.local',
      SEED_ADMIN_NAME: 'Admin Test',
    };

    const result = await seedDatabase(mockPrisma as unknown as PrismaClient, { env: validEnv });

    expect(result.adminEmail).toBe('admin@opensio.local');
    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = mockPrisma.user.upsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({ email: 'admin@opensio.local' });
    expect(upsertCall.update.passwordHash).toBeDefined();
    expect(upsertCall.create.passwordHash).toBeDefined();
    expect(upsertCall.update.passwordHash).toEqual(upsertCall.create.passwordHash);

    // Vérifier que le hash correspond bien au mot de passe fourni
    const isValid = await argon2.verify(upsertCall.update.passwordHash, validPassword);
    expect(isValid).toBe(true);
  });

  it('devrait valider également SEED_STUDENT_PASSWORD lorsque DEMO_SEED=true', async () => {
    const badStudentEnv = {
      SEED_ADMIN_PASSWORD: 'AdminSecurePass2026!',
      DEMO_SEED: 'true',
      SEED_STUDENT_PASSWORD: 'weak',
    };

    await expect(seedDatabase(mockPrisma as unknown as PrismaClient, { env: badStudentEnv }))
      .rejects.toThrow(/SEED_STUDENT_PASSWORD invalide selon la politique D-09/);
  });
});
