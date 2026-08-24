import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LabVerdict } from '../components/labs/lab-verdict';
import type { LabVerdict as LabVerdictType } from '../lib/api/labs-api';

describe('LabVerdict Frontend Component', () => {
  it('affiche un verdict de succès avec le score et les contrôles réussis', () => {
    const verdict: LabVerdictType = {
      passed: true,
      score: 90,
      status: 'passed',
      checks: [
        { id: 'subnets_valid', passed: true, points: 60, message: 'Découpage VLSM correct' },
        { id: 'no_overlap', passed: true, points: 25, message: 'Aucun chevauchement' },
      ],
    };

    render(<LabVerdict verdict={verdict} maxScore={100} />);

    expect(screen.getByText(/Félicitations ! Atelier réussi/i)).toBeDefined();
    expect(screen.getByText('90')).toBeDefined();
    expect(screen.getByText('subnets_valid')).toBeDefined();
    expect(screen.getByText('Découpage VLSM correct')).toBeDefined();
    expect(screen.getByText('+60 pts')).toBeDefined();
  });

  it('affiche un verdict d’échec et permet de réessayer', () => {
    const verdict: LabVerdictType = {
      passed: false,
      score: 60,
      status: 'running',
      checks: [
        { id: 'subnets_valid', passed: true, points: 60, message: 'Découpage correct' },
        { id: 'no_overlap', passed: false, points: 0, message: 'Chevauchement entre services' },
      ],
    };
    const onRetry = vi.fn();

    render(<LabVerdict verdict={verdict} maxScore={100} onRetry={onRetry} />);

    expect(screen.getByText(/Validation incomplète/i)).toBeDefined();
    expect(screen.getByText('Chevauchement entre services')).toBeDefined();

    const retryButton = screen.getByRole('button', { name: /Modifier mes fichiers et réessayer/i });
    expect(retryButton).toBeDefined();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
