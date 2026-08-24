import { PrismaClient } from '@prisma/client';
import { executeContentSync } from './sync.service.js';
import { printSyncReport } from './reporter.js';
import { resolveContentRoot } from '../common/utils/content-path.util.js';

async function main() {
  const targetDir = resolveContentRoot();

  const prisma = new PrismaClient();

  try {
    console.log(`\x1b[36m[OpenSIO Content Sync]\x1b[0m Synchronisation depuis : ${targetDir}`);
    const report = await executeContentSync(prisma, targetDir);
    printSyncReport(report);

    if (!report.success) {
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('\x1b[31m[ERREUR CRITIQUE]\x1b[0m La synchronisation a échoué :', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
