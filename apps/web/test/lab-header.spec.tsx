import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LabHeader } from '../components/labs/lab-header';
import type { LabPublicDetail, LabSession } from '../lib/api/labs-api';

describe('LabHeader', () => {
  const mockLab: LabPublicDetail = {
    id: 'lab-1',
    slug: 'plan-adressage-pme',
    title: 'Plan d\'adressage PME',
    level: '2_files',
    maxScore: 100,
    estimatedMinutes: 40,
    context: 'Contexte du lab',
    objectives: [],
    prerequisites: [],
    topology: null,
    hintsCount: 2,
    hintsSummary: [],
    checksSummary: [],
    editableFiles: [],
    scoring: { floorPercent: 50 },
    isCompleted: false,
    bestScore: null,
    activeSessionId: null,
  };

  it('affiche le cartouche temps et points avec durée, score max et plancher', () => {
    render(<LabHeader lab={mockLab} session={null} />);

    expect(screen.getByText('Plan d\'adressage PME')).toBeDefined();
    expect(screen.getByText('40 min')).toBeDefined();
    expect(screen.getByText('100 points')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('2 disponibles')).toBeDefined();
    expect(screen.getByText('Non démarré')).toBeDefined();
  });

  it('affiche le badge approprié selon l\'état de la session', () => {
    const runningSession: LabSession = {
      id: 'sess-1',
      labId: 'lab-1',
      labSlug: 'plan-adressage-pme',
      labTitle: 'Plan d\'adressage PME',
      labLevel: '2_files',
      userId: 'user-1',
      status: 'running',
      score: null,
      hintsUsed: 0,
      totalHints: 2,
      files: [],
      unlockedHints: [],
      lastResult: null,
      startedAt: '2026-08-26T10:00:00Z',
      expiresAt: '2026-08-26T12:00:00Z',
      completedAt: null,
    };

    const { rerender } = render(<LabHeader lab={mockLab} session={runningSession} />);
    expect(screen.getByText('Session en cours')).toBeDefined();

    const passedSession: LabSession = {
      ...runningSession,
      status: 'passed',
      score: 95,
      completedAt: '2026-08-26T11:00:00Z',
    };
    rerender(<LabHeader lab={mockLab} session={passedSession} />);
    expect(screen.getByText('Validé avec succès (95 pts)')).toBeDefined();
  });
});
