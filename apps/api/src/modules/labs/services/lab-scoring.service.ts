import { Injectable } from '@nestjs/common';
import type { ValidatorCheckResult } from '../runners/lab-runner.interface';

export interface LabCheckDefinition {
  id: string;
  required: boolean;
  points: number;
}

export interface LabHintDefinition {
  cost_percent: number;
  text: string;
}

export interface ScoreCalculationResult {
  passed: boolean;
  rawScore: number;
  finalScore: number;
  penaltyPercent: number;
  penaltyPoints: number;
  requiredChecksPassed: boolean;
}

@Injectable()
export class LabScoringService {
  /**
   * Calcule le score final et le statut de réussite d'une session de lab.
   * Conforme aux règles RM-04 (tous les contrôles obligatoires doivent passer)
   * et RM-05 (déduction des indices avec plancher de score).
   */
  calculateScore(
    checksResults: ValidatorCheckResult[],
    checkDefinitions: LabCheckDefinition[],
    hints: LabHintDefinition[],
    hintsUsedCount: number,
    maxScore = 100,
    floorPercent = 50
  ): ScoreCalculationResult {
    const checksMap = new Map<string, ValidatorCheckResult>(
      checksResults.map((c) => [c.id, c])
    );

    let rawScore = 0;
    let requiredChecksPassed = true;

    for (const def of checkDefinitions) {
      const result = checksMap.get(def.id);
      const isPassed = result?.passed ?? false;

      if (def.required && !isPassed) {
        requiredChecksPassed = false;
      }

      if (isPassed) {
        const pointsAwarded = result?.points !== undefined ? result.points : def.points;
        rawScore += pointsAwarded;
      }
    }

    // Calcul de la pénalité cumulée des indices utilisés (RM-05)
    const validHintsCount = Math.min(Math.max(hintsUsedCount, 0), hints.length);
    let penaltyPercent = 0;
    for (let i = 0; i < validHintsCount; i++) {
      penaltyPercent += hints[i]?.cost_percent ?? 10;
    }

    const penaltyPoints = Math.round((maxScore * penaltyPercent) / 100);
    const scoreFloor = Math.round((maxScore * floorPercent) / 100);

    // Application de la pénalité sans descendre en dessous du plancher (RM-05)
    let finalScore = rawScore;
    if (penaltyPoints > 0 && rawScore > 0) {
      const scoreAfterPenalty = rawScore - penaltyPoints;
      finalScore = Math.max(scoreAfterPenalty, Math.min(rawScore, scoreFloor));
    }

    // RM-04 : Un lab est réussi si TOUS les contrôles obligatoires passent
    const isLabPassed = requiredChecksPassed && rawScore > 0;

    return {
      passed: isLabPassed,
      rawScore,
      finalScore,
      penaltyPercent,
      penaltyPoints,
      requiredChecksPassed,
    };
  }
}
