import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'student@opensio.local' },
    select: { email: true, passwordHash: true },
  });

  console.log('User found:', !!user);
  if (user) {
    console.log('Email:', user.email);
    console.log('Hash:', user.passwordHash);
    console.log('Hash starts with $argon2id$:', user.passwordHash.startsWith('$argon2id$'));
  }

  await prisma.$disconnect();
}

main().catch(console.error);