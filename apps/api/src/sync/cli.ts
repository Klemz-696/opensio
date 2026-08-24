import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { executeContentSync } from './sync.service.js';
import { printSyncReport } from './reporter.js';

function resolveContentDirectory(): string {
  const envPath = process.env.CONTENT_PATH;
  if (envPath) {
    const directPath = resolve(process.cwd(), envPath);
    if (existsSync(directPath)) return directPath;
    const repoRelPath = resolve(process.cwd(), '../..', envPath);
    if (existsSync(repoRelPath)) return repoRelPath;
  }

  const candidatePaths = [
    resolve(process.cwd(), 'content'),
    resolve(process.cwd(), '../../content'),
    resolve(process.cwd(), '../content'),
  ];

  for (const p of candidatePaths) {
    if (existsSync(p) && existsSync(resolve(p, 'tracks'))) {
      return p;
    }
  }

  return resolve(process.cwd(), 'content');
}

async function main() {
  const targetDir = resolveContentDirectory();

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
