import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModuleCard } from '../components/catalog/module-card';
import type { ModuleSummary } from '../lib/api/catalog-api';

describe('ModuleCard', () => {
  const mockModule: ModuleSummary = {
    id: 'mod-1',
    slug: 'reseaux-fondamentaux',
    title: 'Réseaux fondamentaux',
    description: 'Comprendre les concepts de base du réseau.',
    position: 1,
    difficulty: 2,
    estimatedMinutes: 120,
    competencyRefs: ['B2.1', 'B3.2'],
    trackSlug: 'annee-1',
    lessonsCount: 4,
    progress: {
      totalLessons: 4,
      completedLessons: 2,
      progressPercentage: 50,
      isCompleted: false,
    },
  };

  it('affiche le titre, la description, la durée et les compétences', () => {
    render(<ModuleCard module={mockModule} />);

    expect(screen.getByText('Réseaux fondamentaux')).toBeDefined();
    expect(screen.getByText('Comprendre les concepts de base du réseau.')).toBeDefined();
    expect(screen.getByText('Intermédiaire')).toBeDefined();
    expect(screen.getByText('2 h')).toBeDefined();
    expect(screen.getByText('4 leçons')).toBeDefined();
    expect(screen.getByText('B2.1')).toBeDefined();
    expect(screen.getByText('B3.2')).toBeDefined();
    expect(screen.getByText('2/4 leçons')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('affiche le badge "Validé" quand le module est complètement terminé', () => {
    const completedModule: ModuleSummary = {
      ...mockModule,
      progress: {
        totalLessons: 4,
        completedLessons: 4,
        progressPercentage: 100,
        isCompleted: true,
      },
    };

    render(<ModuleCard module={completedModule} />);
    expect(screen.getByText('Validé')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('affiche 0% par défaut si aucune progression n\'est enregistrée', () => {
    const unstartedModule: ModuleSummary = {
      ...mockModule,
      progress: null,
    };

    render(<ModuleCard module={unstartedModule} />);
    expect(screen.getByText('0/4 leçons')).toBeDefined();
    expect(screen.getByText('0%')).toBeDefined();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
  });
});
