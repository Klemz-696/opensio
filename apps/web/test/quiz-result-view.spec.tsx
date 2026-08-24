import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuizResultView } from '../components/quiz/quiz-result-view';
import type { QuizAttemptResult } from '../lib/api/quiz-api';

describe('QuizResultView', () => {
  const mockPassingResult: QuizAttemptResult = {
    id: 'att-1',
    quizId: 'quiz-1',
    quizSlug: 'quiz-adressage',
    score: 100,
    passed: true,
    passingScore: 80,
    totalQuestions: 2,
    correctQuestions: 2,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questions: [
      {
        questionId: 'q1',
        prompt: 'Quelle est l\'adresse réseau ?',
        kind: 'single',
        userAnswers: ['b'],
        isCorrect: true,
        explanation: 'Le pas est de 64.',
      },
      {
        questionId: 'q2',
        prompt: 'Quelles adresses sont privées ?',
        kind: 'multiple',
        userAnswers: ['a', 'b'],
        isCorrect: true,
        explanation: 'Plages RFC 1918.',
      },
    ],
  };

  const mockFailingResult: QuizAttemptResult = {
    id: 'att-2',
    quizId: 'quiz-1',
    quizSlug: 'quiz-adressage',
    score: 50,
    passed: false,
    passingScore: 80,
    totalQuestions: 2,
    correctQuestions: 1,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questions: [
      {
        questionId: 'q1',
        prompt: 'Quelle est l\'adresse réseau ?',
        kind: 'single',
        userAnswers: ['a'],
        isCorrect: false,
        explanation: 'Le pas est de 64.',
      },
    ],
  };

  it('affiche le score de 100% et la mention de validation pour une réussite', () => {
    render(
      <QuizResultView
        result={mockPassingResult}
        moduleSlug="reseaux-fondamentaux"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByText(/Quiz Validé/)).toBeDefined();
    expect(screen.getByText(/Acquis confirmés/)).toBeDefined();
    expect(screen.getByText('Le pas est de 64.')).toBeDefined();
    expect(screen.getByText('Plages RFC 1918.')).toBeDefined();
  });

  it('affiche le score de 50% et la mention d\'échec pour un score insuffisant', () => {
    render(
      <QuizResultView
        result={mockFailingResult}
        moduleSlug="reseaux-fondamentaux"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText(/Score insuffisant/)).toBeDefined();
    expect(screen.getByText(/Tentative non validée/)).toBeDefined();
    expect(screen.getByText(/Incorrect \(0\)/)).toBeDefined();
  });

  it('appelle onRetry au clic sur Recommencer le quiz', () => {
    const handleRetry = vi.fn();
    render(
      <QuizResultView
        result={mockPassingResult}
        moduleSlug="reseaux-fondamentaux"
        onRetry={handleRetry}
      />,
    );

    const retryBtn = screen.getByRole('button', { name: /Recommencer le quiz/i });
    fireEvent.click(retryBtn);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
