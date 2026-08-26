import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuizReviewStep } from '../components/quiz/quiz-review-step';
import type { QuizDetail } from '../lib/api/quiz-api';

describe('QuizReviewStep', () => {
  const mockQuiz: QuizDetail = {
    id: 'quiz-1',
    slug: 'quiz-adressage',
    title: 'Quiz — Adressage IPv4',
    passingScore: 80,
    position: 1,
    module: {
      id: 'mod-1',
      slug: 'reseaux-fondamentaux',
      title: 'Réseaux fondamentaux',
      track: { slug: 'annee-1' },
    },
    questions: [
      {
        id: 'q1',
        kind: 'single',
        prompt: 'Question 1 ?',
        choices: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
        ],
        position: 1,
      },
      {
        id: 'q2',
        kind: 'single',
        prompt: 'Question 2 ?',
        choices: [
          { id: 'c', text: 'Option C' },
          { id: 'd', text: 'Option D' },
        ],
        position: 2,
      },
    ],
  };

  it('affiche le récapitulatif des questions et signale les questions non répondues', () => {
    render(
      <QuizReviewStep
        quiz={mockQuiz}
        answers={{ q1: ['a'] }}
        onEditQuestion={vi.fn()}
        onBackToQuestions={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByText('Récapitulatif de vos réponses')).toBeDefined();
    expect(screen.getByText('1 question sans réponse')).toBeDefined();
    expect(screen.getByText('Option A')).toBeDefined();
    expect(screen.getByText('Aucune réponse sélectionnée')).toBeDefined();
  });

  it('appelle onEditQuestion avec l\'index lors du clic sur Modifier', () => {
    const handleEdit = vi.fn();
    render(
      <QuizReviewStep
        quiz={mockQuiz}
        answers={{ q1: ['a'] }}
        onEditQuestion={handleEdit}
        onBackToQuestions={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    const editBtns = screen.getAllByRole('button', { name: /Modifier/i });
    fireEvent.click(editBtns[1]);

    expect(handleEdit).toHaveBeenCalledWith(1);
  });

  it('appelle onBackToQuestions au clic sur Retour aux questions', () => {
    const handleBack = vi.fn();
    render(
      <QuizReviewStep
        quiz={mockQuiz}
        answers={{}}
        onEditQuestion={vi.fn()}
        onBackToQuestions={handleBack}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Retour aux questions/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('affiche le spinner et désactive le bouton de soumission lors de isSubmitting', () => {
    render(
      <QuizReviewStep
        quiz={mockQuiz}
        answers={{}}
        onEditQuestion={vi.fn()}
        onBackToQuestions={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={true}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Correction en cours/i });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });
});
