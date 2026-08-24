import { ZodError } from 'zod';

export interface LocalizedValidationError {
  filePath: string;
  field: string;
  message: string;
}

export function formatZodError(error: ZodError, filePath: string): LocalizedValidationError[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : '(racine)';
    return {
      filePath,
      field,
      message: issue.message,
    };
  });
}

export function formatValidationErrorReport(errors: LocalizedValidationError[]): string {
  if (errors.length === 0) {
    return 'Aucune erreur de validation.';
  }

  const lines = errors.map(
    (err) => `  - \x1b[31m[ÉCHEC]\x1b[0m ${err.filePath} -> \x1b[33m${err.field}\x1b[0m : ${err.message}`
  );

  return `\x1b[31mErreurs de validation de contenu (${errors.length}) :\x1b[0m\n${lines.join('\n')}`;
}
