import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

async function main(): Promise<void> {
  console.log('🌱 [OpenSIO] Amorçage de la base de données (Seed)...');

  // Compte Administrateur
  const adminEmail = 'admin@opensio.local';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminOpenSIO2026!';
  const adminPasswordHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      displayName: 'Administrateur OpenSIO',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅ Compte Administrateur configuré :`);
  console.log(`   - Email       : ${admin.email}`);
  console.log(`   - Rôle        : ${admin.role}`);
  console.log(`   - Mot de passe: ${adminPassword}`);

  // Compte Étudiant de Démonstration
  const studentEmail = 'student@opensio.local';
  const studentPassword = process.env.STUDENT_INITIAL_PASSWORD || 'StudentOpenSIO2026!';
  const studentPasswordHash = await argon2.hash(studentPassword, ARGON2_OPTIONS);

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: studentEmail,
      passwordHash: studentPasswordHash,
      displayName: 'Étudiant Démo SISR',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅ Compte Étudiant de démo configuré :`);
  console.log(`   - Email       : ${student.email}`);
  console.log(`   - Rôle        : ${student.role}`);
  console.log(`   - Mot de passe: ${studentPassword}`);

  console.log('🎉 [OpenSIO] Amorçage terminé avec succès.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
