import { describe, expect, it } from 'vitest';
import {
  QuizScoringService,
  type QuestionToGrade,
} from '../services/quiz-scoring.service';

describe('QuizScoringService', () => {
  const service = new QuizScoringService();

  const mockQuestions: QuestionToGrade[] = [
    {
      id: 'q1',
      kind: 'SINGLE',
      prompt: 'Quelle est l\'adresse réseau de 192.168.1.77/26 ?',
      correctChoiceIds: ['b'],
      explanation: 'Le pas est de 64, donc 192.168.1.64.',
    },
    {
      id: 'q2',
      kind: 'SINGLE',
      prompt: 'Combien d\'hôtes dans un /27 ?',
      correctChoiceIds: ['b'],
      explanation: '2^5 - 2 = 30 hôtes.',
    },
    {
      id: 'q3',
      kind: 'SINGLE',
      prompt: 'Masque décimal de /28 ?',
      correctChoiceIds: ['c'],
      explanation: '255.255.255.240.',
    },
    {
      id: 'q4',
      kind: 'MULTIPLE',
      prompt: 'Quelles adresses sont privées (RFC 1918) ?',
      correctChoiceIds: ['a', 'b', 'c'],
      explanation: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.',
    },
    {
      id: 'q5',
      kind: 'SINGLE',
      prompt: 'Adresse de broadcast de 10.20.0.0/26 ?',
      correctChoiceIds: ['a'],
      explanation: '10.20.0.63.',
    },
  ];

  describe('gradeQuestion (Évaluation unitaire de question)', () => {
    it('valide une question à choix unique avec la bonne réponse', () => {
      const result = service.gradeQuestion(mockQuestions[0], ['b']);
      expect(result.isCorrect).toBe(true);
      expect(result.normalizedUserAnswers).toEqual(['b']);
    });

    it('rejette une question à choix unique avec une mauvaise réponse', () => {
      const result = service.gradeQuestion(mockQuestions[0], ['a']);
      expect(result.isCorrect).toBe(false);
      expect(result.normalizedUserAnswers).toEqual(['a']);
    });

    it('rejette une question à choix unique sans réponse (tableau vide ou undefined)', () => {
      const res1 = service.gradeQuestion(mockQuestions[0], []);
      expect(res1.isCorrect).toBe(false);

      const res2 = service.gradeQuestion(mockQuestions[0], undefined);
      expect(res2.isCorrect).toBe(false);
      expect(res2.normalizedUserAnswers).toEqual([]);
    });

    it('rejette une question à choix unique si plusieurs réponses sont soumises', () => {
      const result = service.gradeQuestion(mockQuestions[0], ['b', 'c']);
      expect(result.isCorrect).toBe(false);
    });

    it('valide une question à choix multiples quand toutes les bonnes réponses sont fournies', () => {
      const result = service.gradeQuestion(mockQuestions[3], ['a', 'b', 'c']);
      expect(result.isCorrect).toBe(true);
      expect(result.normalizedUserAnswers).toEqual(['a', 'b', 'c']);
    });

    it('valide une question à choix multiples même si l\'ordre des réponses diffère', () => {
      const result = service.gradeQuestion(mockQuestions[3], ['c', 'a', 'b']);
      expect(result.isCorrect).toBe(true);
    });

    it('rejette une question à choix multiples en cas de sélection partielle (0 point)', () => {
      // Seulement 2 bonnes réponses sur 3
      const result = service.gradeQuestion(mockQuestions[3], ['a', 'b']);
      expect(result.isCorrect).toBe(false);
    });

    it('rejette une question à choix multiples avec un mauvais choix intrus (0 point)', () => {
      // 3 bonnes réponses + 1 mauvaise réponse 'd'
      const result = service.gradeQuestion(mockQuestions[3], ['a', 'b', 'c', 'd']);
      expect(result.isCorrect).toBe(false);
    });

    it('dédoublonne les choix identiques soumis par l\'utilisateur', () => {
      const result = service.gradeQuestion(mockQuestions[3], ['a', 'a', 'b', 'c', 'b']);
      expect(result.isCorrect).toBe(true);
      expect(result.normalizedUserAnswers).toEqual(['a', 'b', 'c']);
    });
  });

  describe('gradeQuiz (Calcul de score global & validation seuil RM-01)', () => {
    it('calcule un score de 100 % et valide le quiz quand toutes les réponses sont justes', () => {
      const answers = {
        q1: ['b'],
        q2: ['b'],
        q3: ['c'],
        q4: ['a', 'b', 'c'],
        q5: ['a'],
      };

      const result = service.gradeQuiz(mockQuestions, answers, 80);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(5);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.questionCorrections.every((c) => c.isCorrect)).toBe(true);
    });

    it('calcule un score de 80 % (4/5) et valide le quiz pour un seuil de 80 % (RM-01)', () => {
      const answers = {
        q1: ['b'],
        q2: ['b'],
        q3: ['c'],
        q4: ['a', 'b', 'c'],
        q5: ['d'], // faux
      };

      const result = service.gradeQuiz(mockQuestions, answers, 80);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(4);
      expect(result.score).toBe(80);
      expect(result.passed).toBe(true);
      expect(result.questionCorrections.find((c) => c.questionId === 'q5')?.isCorrect).toBe(false);
      expect(result.questionCorrections.find((c) => c.questionId === 'q5')?.explanation).toBe('10.20.0.63.');
    });

    it('calcule un score de 60 % (3/5) et échoue pour un seuil de 80 %', () => {
      const answers = {
        q1: ['b'],
        q2: ['b'],
        q3: ['c'],
        q4: ['a'], // partiel -> faux
        q5: ['d'], // faux
      };

      const result = service.gradeQuiz(mockQuestions, answers, 80);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(3);
      expect(result.score).toBe(60);
      expect(result.passed).toBe(false);
    });

    it('gère le cas où aucune réponse n\'est soumise', () => {
      const result = service.gradeQuiz(mockQuestions, {}, 80);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(0);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('ignore les identifiants de questions inconnus dans le payload', () => {
      const answers = {
        q1: ['b'],
        unknown_q999: ['a', 'b'],
      };

      const result = service.gradeQuiz(mockQuestions, answers, 80);
      expect(result.totalQuestions).toBe(5);
      expect(result.correctQuestions).toBe(1);
      expect(result.score).toBe(20);
    });

    it('gère un quiz vide sans question (100 % par défaut)', () => {
      const result = service.gradeQuiz([], {}, 80);
      expect(result.totalQuestions).toBe(0);
      expect(result.correctQuestions).toBe(0);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });
  });
});
