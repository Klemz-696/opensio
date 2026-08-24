import { formatValidationErrorReport } from '@opensio/content-schema';
import type { SyncReport, EntitySyncStats } from './types.js';

function formatStatsLine(label: string, stats: EntitySyncStats): string {
  const parts: string[] = [];
  if (stats.created > 0) parts.push(`\x1b[32m+${stats.created} créés\x1b[0m`);
  if (stats.updated > 0) parts.push(`\x1b[33m~${stats.updated} mis à jour\x1b[0m`);
  if (stats.unchanged > 0) parts.push(`\x1b[90m=${stats.unchanged} inchangés\x1b[0m`);
  if (stats.deleted > 0) parts.push(`\x1b[31m-${stats.deleted} supprimés\x1b[0m`);

  const summary = parts.length > 0 ? parts.join(', ') : '\x1b[90m(aucun)\x1b[0m';
  return `  • ${label.padEnd(20)} : ${summary}`;
}

export function printSyncReport(report: SyncReport): void {
  console.log('\n======================================================');
  console.log('       Rapport de synchronisation de contenu          ');
  console.log('======================================================');

  if (report.success) {
    console.log(`\x1b[32m✔ Synchronisation réussie en ${report.durationMs} ms\x1b[0m\n`);
    console.log(formatStatsLine('Tracks (années)', report.stats.tracks));
    console.log(formatStatsLine('Modules', report.stats.modules));
    console.log(formatStatsLine('Leçons', report.stats.lessons));
    console.log(formatStatsLine('Labs', report.stats.labs));
    console.log(formatStatsLine('Quiz', report.stats.quizzes));
    console.log(formatStatsLine('Questions de quiz', report.stats.quizQuestions));
    console.log(formatStatsLine('Associations Leçon-Lab', report.stats.lessonLabs));
  } else {
    console.log(`\x1b[31m✖ Échec de la synchronisation en ${report.durationMs} ms\x1b[0m\n`);
    console.log(formatValidationErrorReport(report.errors));
    console.log('\n\x1b[33m[INFO]\x1b[0m Aucun changement n\'a été appliqué en base de données (tout-ou-rien).');
  }

  console.log('======================================================\n');
}
