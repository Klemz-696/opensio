import { describe, it, expect, beforeEach } from 'vitest';
import {
  LabScoringService,
  type LabCheckDefinition,
  type LabHintDefinition,
} from '../services/lab-scoring.service';
import type { ValidatorCheckResult } from '../runners/lab-runner.interface';

describe('LabScoringService (RM-04 & RM-05)', () => {
  let service: LabScoringService;

  const checkDefinitions: LabCheckDefinition[] = [
    { id: 'subnets_valid', required: true, points: 60 },
    { id: 'no_overlap', required: true, points: 25 },
    { id: 'doc_complete', required: false, points: 15 },
  ];

  const hints: LabHintDefinition[] = [
    { cost_percent: 10, text: 'Indice 1' },
    { cost_percent: 10, text: 'Indice 2' },
  ];

  beforeEach(() => {
    service = new LabScoringService();
  });

  it('calcule 100 points et réussite quand tous les contrôles passent sans indice', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: true, points: 25, message: 'OK' },
      { id: 'doc_complete', passed: true, points: 15, message: 'OK' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      0, // 0 indice utilisé
      100, // maxScore
      50 // floorPercent
    );

    expect(result.passed).toBe(true);
    expect(result.rawScore).toBe(100);
    expect(result.finalScore).toBe(100);
    expect(result.penaltyPoints).toBe(0);
    expect(result.requiredChecksPassed).toBe(true);
  });

  it('RM-04 : échoue si un contrôle obligatoire échoue même avec des points', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: false, points: 0, message: 'Overlap détecté' },
      { id: 'doc_complete', passed: true, points: 15, message: 'OK' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      0,
      100,
      50
    );

    expect(result.passed).toBe(false);
    expect(result.requiredChecksPassed).toBe(false);
    expect(result.rawScore).toBe(75);
    expect(result.finalScore).toBe(75);
  });

  it('RM-04 : réussit si tous les contrôles obligatoires passent mais que l’optionnel échoue', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: true, points: 25, message: 'OK' },
      { id: 'doc_complete', passed: false, points: 0, message: 'Optionnel manquant' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      0,
      100,
      50
    );

    expect(result.passed).toBe(true);
    expect(result.requiredChecksPassed).toBe(true);
    expect(result.rawScore).toBe(85);
    expect(result.finalScore).toBe(85);
  });

  it('RM-05 : applique la pénalité d’un indice (-10%)', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: true, points: 25, message: 'OK' },
      { id: 'doc_complete', passed: true, points: 15, message: 'OK' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      1, // 1 indice consommé (10%)
      100,
      50
    );

    expect(result.passed).toBe(true);
    expect(result.rawScore).toBe(100);
    expect(result.penaltyPercent).toBe(10);
    expect(result.penaltyPoints).toBe(10);
    expect(result.finalScore).toBe(90);
  });

  it('RM-05 : applique la pénalité de deux indices (-20%)', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: true, points: 25, message: 'OK' },
      { id: 'doc_complete', passed: true, points: 15, message: 'OK' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      2, // 2 indices consommés (20%)
      100,
      50
    );

    expect(result.passed).toBe(true);
    expect(result.rawScore).toBe(100);
    expect(result.penaltyPercent).toBe(20);
    expect(result.penaltyPoints).toBe(20);
    expect(result.finalScore).toBe(80);
  });

  it('RM-05 : respecte le plancher de score (floor_percent = 50%)', () => {
    const manyHints: LabHintDefinition[] = [
      { cost_percent: 25, text: 'H1' },
      { cost_percent: 25, text: 'H2' },
      { cost_percent: 25, text: 'H3' },
    ];

    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: true, points: 60, message: 'OK' },
      { id: 'no_overlap', passed: true, points: 25, message: 'OK' },
      { id: 'doc_complete', passed: true, points: 15, message: 'OK' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      manyHints,
      3, // 75% de pénalités cumulées
      100,
      50 // plancher 50%
    );

    expect(result.passed).toBe(true);
    expect(result.rawScore).toBe(100);
    expect(result.penaltyPercent).toBe(75);
    expect(result.penaltyPoints).toBe(75);
    expect(result.finalScore).toBe(50); // Bloqué au plancher 50 points
  });

  it('renvoie 0 point et échoué si aucun contrôle ne passe', () => {
    const checksResults: ValidatorCheckResult[] = [
      { id: 'subnets_valid', passed: false, points: 0, message: 'KO' },
      { id: 'no_overlap', passed: false, points: 0, message: 'KO' },
      { id: 'doc_complete', passed: false, points: 0, message: 'KO' },
    ];

    const result = service.calculateScore(
      checksResults,
      checkDefinitions,
      hints,
      1,
      100,
      50
    );

    expect(result.passed).toBe(false);
    expect(result.rawScore).toBe(0);
    expect(result.finalScore).toBe(0);
  });
});
