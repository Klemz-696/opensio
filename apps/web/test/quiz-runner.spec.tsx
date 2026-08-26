import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuizRunner } from '../components/quiz/quiz-runner';
import type { QuizDetail } from '../lib/api/quiz-api';

describe('QuizRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('affiche le titre du quiz, le seuil de réussite et la première question', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    expect(screen.getByText('Quiz — Adressage IPv4')).toBeDefined();
    expect(screen.getByText(/Seuil de validation : 80%/)).toBeDefined();
    expect(screen.getByText('Question 1 sur 2 (0% complété)')).toBeDefined();
    expect(screen.getByText('Quelle est l\'adresse réseau de 192.168.1.77/26 ?')).toBeDefined();
  });

  it('navigue pas-à-pas entre les questions avec Suivante et Précédente', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    // Répondre à Q1
    fireEvent.click(screen.getByText('192.168.1.64'));

    // Clic sur Suivante -> Question 2
    const nextBtn = screen.getByRole('button', { name: /Suivante/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Question 2 sur 2 (50% complété)')).toBeDefined();
    expect(screen.getByText('Quelles adresses sont privées selon la RFC 1918 ?')).toBeDefined();

    // Clic sur Précédente -> Retour Question 1
    const prevBtn = screen.getByRole('button', { name: /Précédente/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText('Question 1 sur 2 (50% complété)')).toBeDefined();
  });

  it('permet de naviguer directement via le stepper', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    // Clic sur pastille 2 du stepper
    const step2Btn = screen.getByRole('button', { name: /Question 2/i });
    fireEvent.click(step2Btn);

    expect(screen.getByText('Question 2 sur 2 (0% complété)')).toBeDefined();
    expect(screen.getByText('Quelles adresses sont privées selon la RFC 1918 ?')).toBeDefined();
  });

  it('affiche le récapitulatif des réponses et permet de soumettre', () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuizRunner quiz={mockQuiz} onSubmit={handleSubmit} isSubmitting={false} />);

    // Répondre à Q1
    fireEvent.click(screen.getByText('192.168.1.64'));

    // Passer à Q2 et répondre
    fireEvent.click(screen.getByRole('button', { name: /Suivante/i }));
    fireEvent.click(screen.getByText('10.0.0.1'));
    fireEvent.click(screen.getByText('172.20.1.1'));

    // Aller à l'écran de révision
    fireEvent.click(screen.getByRole('button', { name: /Vérifier & Soumettre/i }));

    expect(screen.getByText('Récapitulatif de vos réponses')).toBeDefined();
    expect(screen.getByText(/Toutes les questions sont renseignées/)).toBeDefined();

    // Clic sur Confirmer et soumettre
    const submitBtn = screen.getByRole('button', { name: /Confirmer et soumettre le quiz/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      q1: ['b'],
      q2: ['a', 'b'],
    });
  });

  it('permet de modifier une réponse depuis l\'écran de révision', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={false} />);

    // Aller directement à la revue
    fireEvent.click(screen.getByRole('button', { name: /Revoir mes réponses/i }));
    expect(screen.getByText('Récapitulatif de vos réponses')).toBeDefined();

    // Modifier la question 1
    const editBtns = screen.getAllByRole('button', { name: /Modifier/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Question 1 sur 2 (0% complété)')).toBeDefined();
  });

  it('désactive les boutons de navigation pendant la soumission', () => {
    render(<QuizRunner quiz={mockQuiz} onSubmit={vi.fn()} isSubmitting={true} />);

    const nextBtn = screen.getByRole('button', { name: /Suivante/i });
    expect(nextBtn.hasAttribute('disabled')).toBe(true);

    const reviewBtn = screen.getByRole('button', { name: /Revoir mes réponses/i });
    expect(reviewBtn.hasAttribute('disabled')).toBe(true);
  });
});
