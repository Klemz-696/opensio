import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

async function main(): Promise<void> {
  console.log('[OpenSIO] Amorçage de la base de données (Seed)...');

  const isDev = process.env.NODE_ENV !== 'production';

  // 1. Compte Administrateur (configuré via variables d'environnement)
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@opensio.local';
  const adminDisplayName = process.env.SEED_ADMIN_NAME || 'Administrateur OpenSIO';
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    if (!isDev) {
      console.warn(
        '[!] [ATTENTION] Variable SEED_ADMIN_PASSWORD non définie hors environnement de développement ! Utilisation du mot de passe de secours.'
      );
    }
    adminPassword = 'AdminOpenSIO2026!';
  }
  const adminPasswordHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: adminDisplayName,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
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
  const isDemoSeedEnabled = process.env.DEMO_SEED === 'true';

  if (isDemoSeedEnabled) {
    const studentEmail = process.env.SEED_STUDENT_EMAIL || 'student@opensio.local';
    const studentDisplayName = process.env.SEED_STUDENT_NAME || 'Étudiant Démo SISR';
    let studentPassword = process.env.SEED_STUDENT_PASSWORD;
    if (!studentPassword) {
      if (!isDev) {
        console.warn(
          '[!] [ATTENTION] Variable SEED_STUDENT_PASSWORD non définie hors environnement de développement ! Utilisation du mot de passe de secours.'
        );
      }
      studentPassword = 'StudentOpenSIO2026!';
    }
    const studentPasswordHash = await argon2.hash(studentPassword, ARGON2_OPTIONS);

    const student = await prisma.user.upsert({
      where: { email: studentEmail },
      update: {
        displayName: studentDisplayName,
        role: Role.APPRENANT,
        status: UserStatus.ACTIVE,
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
}

main()
  .catch((e) => {
    console.error('[x] Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
