import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuizStepper } from '../components/quiz/quiz-stepper';
import type { QuizQuestion } from '../lib/api/quiz-api';

describe('QuizStepper', () => {
  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      kind: 'single',
      prompt: 'Question 1',
      choices: [{ id: 'a', text: 'A' }],
      position: 1,
    },
    {
      id: 'q2',
      kind: 'single',
      prompt: 'Question 2',
      choices: [{ id: 'b', text: 'B' }],
      position: 2,
    },
    {
      id: 'q3',
      kind: 'single',
      prompt: 'Question 3',
      choices: [{ id: 'c', text: 'C' }],
      position: 3,
    },
  ];

  it('affiche les boutons pour chaque question et l\'onglet de revue', () => {
    render(
      <QuizStepper
        questions={mockQuestions}
        currentIndex={0}
        isReviewMode={false}
        answers={{ q1: ['a'] }}
        onSelectQuestion={vi.fn()}
        onGoToReview={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Question 1 \(répondue\) \(en cours\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Question 2/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Question 3/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Récapitulatif des réponses/i })).toBeDefined();
  });

  it('appelle onSelectQuestion au clic sur une question', () => {
    const handleSelect = vi.fn();
    render(
      <QuizStepper
        questions={mockQuestions}
        currentIndex={0}
        isReviewMode={false}
        answers={{}}
        onSelectQuestion={handleSelect}
        onGoToReview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Question 2/i }));
    expect(handleSelect).toHaveBeenCalledWith(1);
  });

  it('appelle onGoToReview au clic sur le bouton Revue', () => {
    const handleReview = vi.fn();
    render(
      <QuizStepper
        questions={mockQuestions}
        currentIndex={0}
        isReviewMode={false}
        answers={{}}
        onSelectQuestion={vi.fn()}
        onGoToReview={handleReview}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Récapitulatif des réponses/i }));
    expect(handleReview).toHaveBeenCalledTimes(1);
  });
});
