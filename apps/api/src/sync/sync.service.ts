import { PrismaClient } from '@prisma/client';
import { scanContentDirectory } from './scanner.js';
import { validateScannedContent } from './validator.js';
import { writeScannedContentToDatabase } from './writer.js';
import type { SyncReport } from './types.js';

export async function executeContentSync(
  prisma: PrismaClient,
  contentDir: string,
  cacheInvalidator?: { invalidateAll: () => void }
): Promise<SyncReport> {
  const startTime = Date.now();

  // 1. Scan récursif et parsing des fichiers
  const scanned = scanContentDirectory(contentDir);

  // 2. Validation stricte et intégrité référentielle
  const validationErrors = validateScannedContent(scanned);

  if (validationErrors.length > 0) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      durationMs,
      stats: {
        tracks: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        modules: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        lessons: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        quizzes: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        quizQuestions: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        labs: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
        lessonLabs: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
      },
      errors: validationErrors,
    };
  }

  // 3. Écriture transactionnelle en base
  const stats = await writeScannedContentToDatabase(prisma, scanned);

  // 4. Invalidation du cache mémoire du catalogue (§41)
  if (cacheInvalidator) {
    cacheInvalidator.invalidateAll();
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    durationMs,
    stats,
    errors: [],
  };
}
