import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LessonModuleSidebar } from '../components/lessons/lesson-module-sidebar';
import type { ModuleDetail } from '../lib/api/catalog-api';

describe('LessonModuleSidebar', () => {
  const mockModule: ModuleDetail = {
    id: 'mod-1',
    slug: 'reseaux-fondamentaux',
    title: 'Réseaux fondamentaux',
    description: 'Module de base',
    position: 1,
    difficulty: 2,
    estimatedMinutes: 120,
    competencyRefs: ['B1.1'],
    track: {
      id: 't-1',
      slug: 'annee-1',
      title: '1ère Année BTS SIO',
    },
    lessons: [
      {
        id: 'l-1',
        slug: '01-adressage-ipv4',
        title: 'Adressage IPv4',
        difficulty: 1,
        estimatedMinutes: 30,
        position: 1,
        status: 'completed',
      },
      {
        id: 'l-2',
        slug: '02-modeles-osi',
        title: 'Modèles OSI et TCP/IP',
        difficulty: 2,
        estimatedMinutes: 45,
        position: 2,
        status: 'started',
      },
      {
        id: 'l-3',
        slug: '03-vlsm',
        title: 'Subnetting VLSM',
        difficulty: 3,
        estimatedMinutes: 45,
        position: 3,
        status: null,
      },
    ],
    quizzes: [
      {
        id: 'q-1',
        slug: 'quiz-reseaux',
        title: 'Quiz Réseaux',
        passingScore: 80,
        position: 1,
        questionsCount: 5,
        passed: true,
        bestScore: 100,
      },
    ],
    labs: [
      {
        id: 'lab-1',
        slug: 'plan-adressage-pme',
        title: 'Plan d\'adressage PME',
        level: 'LEVEL_2_FILES',
        maxScore: 100,
        estimatedMinutes: 45,
      },
    ],
  };

  it('affiche le titre du module, les leçons, le quiz et le lab', () => {
    render(
      <LessonModuleSidebar
        module={mockModule}
        currentLessonSlug="02-modeles-osi"
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Réseaux fondamentaux')).toBeDefined();
    expect(screen.getByText('Adressage IPv4')).toBeDefined();
    expect(screen.getByText('Modèles OSI et TCP/IP')).toBeDefined();
    expect(screen.getByText('Subnetting VLSM')).toBeDefined();
    expect(screen.getByText('Quiz Réseaux')).toBeDefined();
    expect(screen.getByText('Plan d\'adressage PME')).toBeDefined();
    expect(screen.getByText('1/3 leçons')).toBeDefined();
    expect(screen.getByText('33%')).toBeDefined();
  });

  it('indique la leçon active avec l\'attribut aria-current="page"', () => {
    render(
      <LessonModuleSidebar
        module={mockModule}
        currentLessonSlug="02-modeles-osi"
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const activeLink = screen.getByText('Modèles OSI et TCP/IP').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');

    const inactiveLink = screen.getByText('Adressage IPv4').closest('a');
    expect(inactiveLink?.getAttribute('aria-current')).toBeNull();
  });

  it('appelle onToggle et onClose lors des interactions utilisateur', () => {
    const handleToggle = vi.fn();
    const handleClose = vi.fn();

    render(
      <LessonModuleSidebar
        module={mockModule}
        currentLessonSlug="02-modeles-osi"
        isOpen={true}
        onToggle={handleToggle}
        onClose={handleClose}
      />,
    );

    const toggleBtn = screen.getByLabelText('Replier le sommaire');
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    // Touche Échap
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
