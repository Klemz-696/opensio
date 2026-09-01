import { PrismaClient } from '@prisma/client';

async function ensureTestDatabase() {
  const baseDbUrl =
    process.env.DATABASE_URL ||
    'postgresql://opensio:opensio-super-secure-dev-db-pass-2026!@127.0.0.1:5432/opensio';

  const adminUrl = baseDbUrl.replace(/\/opensio_test(\?.*)?$/, '/opensio$1');

  const prisma = new PrismaClient({
    datasources: {
      db: { url: adminUrl },
    },
  });

  try {
    await prisma.$connect();
    const result = (await prisma.$queryRawUnsafe(
      "SELECT 1 FROM pg_database WHERE datname = 'opensio_test';"
    )) as unknown[];
    if (!Array.isArray(result) || result.length === 0) {
      await prisma.$executeRawUnsafe('CREATE DATABASE opensio_test;');
      console.log('Base de donnees opensio_test creee avec succes.');
    } else {
      console.log('Base de donnees opensio_test deja existante.');
    }
  } catch (error) {
    console.warn('Avertissement lors de la verification de opensio_test :', (error as Error)?.message || error);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

ensureTestDatabase().catch(() => {});
