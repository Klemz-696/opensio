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
  });
});
