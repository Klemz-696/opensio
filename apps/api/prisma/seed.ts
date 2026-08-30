import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { isPasswordPolicyValid } from '../src/modules/auth/dto/register.dto';

const prisma = new PrismaClient();

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 4,
} as const;

export interface SeedOptions {
  env?: Record<string, string | undefined>;
}

export async function seedDatabase(
  client: PrismaClient,
  options: SeedOptions = {},
): Promise<{ adminEmail: string; studentEmail?: string }> {
  const env = options.env || process.env;
  const isDev = env.NODE_ENV !== 'production';

  console.log('[OpenSIO] Amorçage de la base de données (Seed)...');

  // 1. Compte Administrateur (configuré via variables d'environnement)
  const adminEmail = env.SEED_ADMIN_EMAIL || 'admin@opensio.local';
  const adminDisplayName = env.SEED_ADMIN_NAME || 'Administrateur OpenSIO';
  let adminPassword = env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    if (!isDev) {
      console.warn(
        '[!] [ATTENTION] Variable SEED_ADMIN_PASSWORD non définie hors environnement de développement ! Utilisation du mot de passe de secours.',
      );
    }
    adminPassword = 'AdminOpenSIO2026!';
  }

  // Validation stricte de la politique de mot de passe D-09
  if (!isPasswordPolicyValid(adminPassword)) {
    const errorMsg =
      `\n❌ [ERREUR FATALE SEED] Le mot de passe administrateur (SEED_ADMIN_PASSWORD) ne respecte pas la politique de sécurité D-09.\n` +
      `Exigences : minimum 12 caractères et au moins 3 classes de caractères parmi minuscules, majuscules, chiffres et caractères spéciaux.\n`;
    console.error(errorMsg);
    throw new Error(
      `SEED_ADMIN_PASSWORD invalide selon la politique D-09 (mot de passe trop faible).`,
    );
  }

  const adminPasswordHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);

  const admin = await client.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      displayName: adminDisplayName,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      displayName: adminDisplayName,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });

  console.log(`[v] Compte Administrateur configuré :`);
  console.log(`   - Email       : ${admin.email}`);
  console.log(`   - Nom         : ${admin.displayName}`);
  console.log(`   - Rôle        : ${admin.role}`);
  console.log(`   - Mot de passe: ${adminPassword}`);

  // 2. Compte Démo : seed uniquement si DEMO_SEED=true (absent par défaut)
  const isDemoSeedEnabled = env.DEMO_SEED === 'true';
  let studentEmail: string | undefined;

  if (isDemoSeedEnabled) {
    studentEmail = env.SEED_STUDENT_EMAIL || 'student@opensio.local';
    const studentDisplayName = env.SEED_STUDENT_NAME || 'Étudiant Démo SISR';
    let studentPassword = env.SEED_STUDENT_PASSWORD;

    if (!studentPassword) {
      if (!isDev) {
        console.warn(
          '[!] [ATTENTION] Variable SEED_STUDENT_PASSWORD non définie hors environnement de développement ! Utilisation du mot de passe de secours.',
        );
      }
      studentPassword = 'StudentOpenSIO2026!';
    }

    // Validation stricte de la politique de mot de passe D-09
    if (!isPasswordPolicyValid(studentPassword)) {
      const errorMsg =
        `\n❌ [ERREUR FATALE SEED] Le mot de passe étudiant démo (SEED_STUDENT_PASSWORD) ne respecte pas la politique de sécurité D-09.\n` +
        `Exigences : minimum 12 caractères et au moins 3 classes de caractères parmi minuscules, majuscules, chiffres et caractères spéciaux.\n`;
      console.error(errorMsg);
      throw new Error(
        `SEED_STUDENT_PASSWORD invalide selon la politique D-09 (mot de passe trop faible).`,
      );
    }

    const studentPasswordHash = await argon2.hash(studentPassword, ARGON2_OPTIONS);

    const student = await client.user.upsert({
      where: { email: studentEmail },
      update: {
        passwordHash: studentPasswordHash,
        displayName: studentDisplayName,
        role: Role.APPRENANT,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      },
      create: {
        email: studentEmail,
        passwordHash: studentPasswordHash,
        displayName: studentDisplayName,
        role: Role.APPRENANT,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      },
    });

    console.log(`[v] Compte Étudiant de démo configuré (DEMO_SEED=true) :`);
    console.log(`   - Email       : ${student.email}`);
    console.log(`   - Rôle        : ${student.role}`);
    console.log(`   - Mot de passe: ${studentPassword}`);
  } else {
    console.log('[i] [OpenSIO] DEMO_SEED !== true : Aucun compte démo inséré (absent par défaut).');
  }

  console.log('[v] [OpenSIO] Amorçage terminé avec succès.');
  return { adminEmail, studentEmail };
}

async function main(): Promise<void> {
  try {
    await seedDatabase(prisma);
  } catch (e) {
    console.error('[x] Échec du seed :', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST || process.env.FORCE_SEED === 'true') {
  void main();
}
