import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LessonNavigation } from '../components/lessons/lesson-navigation';
import type { LessonSummary, QuizSummary } from '../lib/api/catalog-api';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LessonNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const prevLesson: LessonSummary = {
    id: 'l-1',
    slug: '01-adressage-ipv4',
    title: 'Adressage IPv4',
    difficulty: 1,
    estimatedMinutes: 30,
    position: 1,
    status: 'completed',
  };

  const nextLesson: LessonSummary = {
    id: 'l-3',
    slug: '03-subnetting-vlsm',
    title: 'Subnetting VLSM',
    difficulty: 2,
    estimatedMinutes: 45,
    position: 3,
    status: null,
  };

  const mockQuiz: QuizSummary = {
    id: 'q-1',
    slug: 'quiz-reseaux',
    title: 'Quiz Réseaux Fondamentaux',
    passingScore: 80,
    position: 1,
    questionsCount: 5,
  };

  it('affiche les boutons Précédent et Suivant avec les titres des leçons', () => {
    render(
      <LessonNavigation
        moduleSlug="reseaux-fondamentaux"
        previousLesson={prevLesson}
        nextLesson={nextLesson}
      />,
    );

    expect(screen.getByText('Leçon précédente')).toBeDefined();
    expect(screen.getByText('Adressage IPv4')).toBeDefined();
    expect(screen.getByText('Leçon suivante')).toBeDefined();
    expect(screen.getByText('Subnetting VLSM')).toBeDefined();
  });

  it('affiche le lien vers le quiz quand il s\'agit de la dernière leçon', () => {
    render(
      <LessonNavigation
        moduleSlug="reseaux-fondamentaux"
        previousLesson={prevLesson}
        nextLesson={null}
        quiz={mockQuiz}
      />,
    );

    expect(screen.getByText('Passer le quiz du module')).toBeDefined();
    expect(screen.getByText('Dernière leçon — Évaluation finale')).toBeDefined();
  });

  it('navigue avec les touches Flèche gauche et Flèche droite', () => {
    render(
      <LessonNavigation
        moduleSlug="reseaux-fondamentaux"
        previousLesson={prevLesson}
        nextLesson={nextLesson}
      />,
    );

    // Flèche gauche -> leçon précédente
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(mockPush).toHaveBeenCalledWith('/catalogue/reseaux-fondamentaux/01-adressage-ipv4');

    // Flèche droite -> leçon suivante
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockPush).toHaveBeenCalledWith('/catalogue/reseaux-fondamentaux/03-subnetting-vlsm');
  });

  it('ne déclenche pas la navigation clavier si le focus est dans un input ou textarea', () => {
    render(
      <div>
        <input data-testid="test-input" type="text" />
        <LessonNavigation
          moduleSlug="reseaux-fondamentaux"
          previousLesson={prevLesson}
          nextLesson={nextLesson}
        />
      </div>,
    );

    const input = screen.getByTestId('test-input');
    input.focus();

    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ne déclenche pas la navigation si une touche modificatrice est pressée (Alt, Ctrl, Meta, Shift)', () => {
    render(
      <LessonNavigation
        moduleSlug="reseaux-fondamentaux"
        previousLesson={prevLesson}
        nextLesson={nextLesson}
      />,
    );

    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
