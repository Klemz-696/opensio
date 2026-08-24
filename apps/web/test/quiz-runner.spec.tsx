import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuizRunner } from '../components/quiz/quiz-runner';
import type { QuizDetail } from '../lib/api/quiz-api';

describe('QuizRunner', () => {
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
      track: {
        slug: 'annee-1',
      },
    },
    questions: [
      {
        id: 'q1',
        kind: 'single',
        prompt: 'Quelle est l\'adresse réseau de 192.168.1.77/26 ?',
        choices: [
          { id: 'a', text: '192.168.1.0' },
          { id: 'b', text: '192.168.1.64' },
          { id: 'c', text: '192.168.1.128' },
        ],
        position: 1,
      },
      {
        id: 'q2',
        kind: 'multiple',
        prompt: 'Quelles adresses sont privées selon la RFC 1918 ?',
        choices: [
          { id: 'a', text: '10.0.0.1' },
          { id: 'b', text: '172.20.1.1' },
          { id: 'c', text: '8.8.8.8' },
        ],
        position: 2,
      },
    ],
  };

  it('affiche le titre du quiz, le seuil de réussite et toutes les questions', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    expect(screen.getByText('Quiz — Adressage IPv4')).toBeDefined();
    expect(screen.getByText(/Seuil de validation : 80%/)).toBeDefined();
    expect(screen.getByText('Question 1')).toBeDefined();
    expect(screen.getByText('Question 2')).toBeDefined();
  });

  it('gère la sélection unique (radio) et multiple (checkbox)', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    // Question 1 : Choix unique
    const optionQ1A = screen.getByText('192.168.1.0');
    const optionQ1B = screen.getByText('192.168.1.64');

    fireEvent.click(optionQ1A);
    fireEvent.click(optionQ1B); // Remplace le choix A

    // Question 2 : Choix multiples
    const optionQ2A = screen.getByText('10.0.0.1');
    const optionQ2B = screen.getByText('172.20.1.1');

    fireEvent.click(optionQ2A);
    fireEvent.click(optionQ2B); // Ajoute le choix B

    expect(screen.getByText(/Progression/)).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('soumet les réponses sélectionnées au clic sur le bouton Valider', () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuizRunner quiz={mockQuiz} onSubmit={handleSubmit} isSubmitting={false} />);

    // Sélectionner les réponses
    fireEvent.click(screen.getByText('192.168.1.64'));
    fireEvent.click(screen.getByText('10.0.0.1'));
    fireEvent.click(screen.getByText('172.20.1.1'));

    const submitBtn = screen.getByRole('button', { name: /Valider mes réponses/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      q1: ['b'],
      q2: ['a', 'b'],
    });
  });

  it('désactive le bouton et affiche le spinner pendant la soumission', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={true} />);

    const submitBtn = screen.getByRole('button', { name: /Correction en cours/i });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });
});
