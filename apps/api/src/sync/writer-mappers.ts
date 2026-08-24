import { LabLevel, QuizQuestionKind } from '@prisma/client';
import type { EntitySyncStats } from './types.js';

export function createInitialStats(): EntitySyncStats {
  return { created: 0, updated: 0, unchanged: 0, deleted: 0 };
}

export function mapLabLevel(level: string): LabLevel {
  switch (level) {
    case '2_files':
      return LabLevel.LEVEL_2_FILES;
    case '3_container':
      return LabLevel.LEVEL_3_CONTAINER;
    case '4_vm':
      return LabLevel.LEVEL_4_VM;
    case '1_theory':
    default:
      return LabLevel.LEVEL_1_THEORY;
  }
}

export function mapQuestionKind(kind: string): QuizQuestionKind {
  return kind === 'multiple' ? QuizQuestionKind.MULTIPLE : QuizQuestionKind.SINGLE;
}
