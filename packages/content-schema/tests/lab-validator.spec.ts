import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const validatorDir = resolve(
  __dirname,
  '../../../content/tracks/annee-1/modules/reseaux-fondamentaux/labs/lab-plan-adressage/validator'
);

interface ValidationVerdict {
  passed: boolean;
  score: number;
  checks: Array<{ id: string; passed: boolean; points: number; message: string }>;
}

let validatePlanCsv: (workDir?: string) => ValidationVerdict;

describe('Validateur de Lab — Plan d’adressage d’une PME', () => {
  beforeAll(async () => {
    const validatorModulePath = join(validatorDir, 'validate.mjs');
    const validatorModule = await import(pathToFileURL(validatorModulePath).href);
    validatePlanCsv = validatorModule.validatePlanCsv;
  });

  it('valide la solution correcte avec un score maximal de 100/100', () => {
    const validDir = join(validatorDir, 'solutions', 'valid');
    const result = validatePlanCsv(validDir);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.checks).toHaveLength(3);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('rejette la solution avec chevauchement de sous-réseaux', () => {
    const invalidOverlapDir = join(validatorDir, 'solutions', 'invalid-overlap');
    const result = validatePlanCsv(invalidOverlapDir);

    expect(result.passed).toBe(false);
    const overlapCheck = result.checks.find((c) => c.id === 'no_overlap');
    expect(overlapCheck?.passed).toBe(false);
  });

  it('rejette la solution avec des sous-réseaux trop petits (capacité insuffisante)', () => {
    const invalidCapacityDir = join(validatorDir, 'solutions', 'invalid-capacity');
    const result = validatePlanCsv(invalidCapacityDir);

    expect(result.passed).toBe(false);
    const subnetsCheck = result.checks.find((c) => c.id === 'subnets_valid');
    expect(subnetsCheck?.passed).toBe(false);
  });

  it('gère proprement l’absence de fichier', () => {
    const result = validatePlanCsv('/chemin/inexistant');

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.checks[0].message).toContain('introuvable');
  });
});
