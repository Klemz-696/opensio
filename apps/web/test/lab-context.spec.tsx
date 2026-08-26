import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LabContext } from '../components/labs/lab-context';
import type { LabPublicDetail } from '../lib/api/labs-api';

describe('LabContext', () => {
  const mockLab: LabPublicDetail = {
    id: 'lab-1',
    slug: 'plan-adressage-pme',
    title: 'Plan d\'adressage PME',
    level: '2_files',
    maxScore: 100,
    estimatedMinutes: 40,
    context: 'Contexte détaillé du lab avec **instructions** et commande `ip addr`.',
    objectives: ['Objectif numéro 1'],
    prerequisites: ['adressage-ipv4'],
    topology: null,
    hintsCount: 2,
    hintsSummary: [],
    checksSummary: [
      { id: 'subnets_valid', required: true, points: 60, description: 'Découpage VLSM correct' },
    ],
    editableFiles: [],
    scoring: { floorPercent: 50 },
    isCompleted: false,
    bestScore: null,
    activeSessionId: null,
  };

  it('affiche le contexte en Markdown, les contrôles et les prérequis', () => {
    render(<LabContext lab={mockLab} sessionId="sess-1" />);

    expect(screen.getByText('Contexte & Scénario')).toBeDefined();
    expect(screen.getByText(/Contexte détaillé du lab/)).toBeDefined();
    expect(screen.getByText('Contrôles du validateur')).toBeDefined();
    expect(screen.getAllByText('Découpage VLSM correct').length).toBeGreaterThan(0);
    expect(screen.getByText('Leçons prérequises conseillées')).toBeDefined();
    expect(screen.getByText('adressage-ipv4')).toBeDefined();
  });
});
