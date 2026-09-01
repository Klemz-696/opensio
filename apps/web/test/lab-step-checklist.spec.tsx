import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LabStepChecklist } from '../components/labs/lab-step-checklist';
import type { LabPublicDetail } from '../lib/api/labs-api';

describe('LabStepChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockLab: LabPublicDetail = {
    id: 'lab-1',
    slug: 'plan-adressage-pme',
    title: 'Plan d\'adressage PME',
    level: '2_files',
    maxScore: 100,
    estimatedMinutes: 40,
    context: 'Contexte du lab',
    objectives: [
      'Découper le réseau 10.20.0.0/24',
      'Documenter chaque sous-réseau',
    ],
    prerequisites: ['adressage-ipv4'],
    topology: null,
    hintsCount: 2,
    hintsSummary: [],
    checksSummary: [
      { id: 'subnets_valid', required: true, points: 60, description: 'Découpage VLSM correct' },
      { id: 'no_overlap', required: true, points: 25, description: 'Aucun chevauchement' },
    ],
    editableFiles: [],
    scoring: { floorPercent: 50 },
    isCompleted: false,
    bestScore: null,
    activeSessionId: null,
  };

  it('affiche la liste des étapes et la progression initiale à 0%', () => {
    render(<LabStepChecklist lab={mockLab} sessionId="sess-1" />);

    expect(screen.getByText('Checklist de progression du Lab')).toBeDefined();
    expect(screen.getByText('0 / 4 (0%)')).toBeDefined();
    expect(screen.getByText('Découper le réseau 10.20.0.0/24')).toBeDefined();
    expect(screen.getByText('Découpage VLSM correct')).toBeDefined();
  });

  it('permet de cocher une étape et met à jour la progression et localStorage', () => {
    render(<LabStepChecklist lab={mockLab} sessionId="sess-1" />);

    const stepBtn = screen.getByRole('button', { name: /Étape 1/i });
    fireEvent.click(stepBtn);

    expect(screen.getByText('1 / 4 (25%)')).toBeDefined();
    const stored = localStorage.getItem('opensio:lab-checklist:plan-adressage-pme:sess-1');
    expect(stored).toContain('obj-0');
  });

  it('permet de réinitialiser les étapes cochées', () => {
    render(<LabStepChecklist lab={mockLab} sessionId="sess-1" />);

    const stepBtn = screen.getByRole('button', { name: /Étape 1/i });
    fireEvent.click(stepBtn);
    expect(screen.getByText('1 / 4 (25%)')).toBeDefined();

    const resetBtn = screen.getByRole('button', { name: /Réinitialiser les étapes/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('0 / 4 (0%)')).toBeDefined();
  });
});
