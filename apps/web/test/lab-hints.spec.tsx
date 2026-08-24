import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LabHints } from '../components/labs/lab-hints';
import type { LabUnlockedHint, LabHintSummary } from '../lib/api/labs-api';

describe('LabHints Frontend Component (RM-05)', () => {
  const hintsSummary: LabHintSummary[] = [
    { index: 1, costPercent: 10 },
    { index: 2, costPercent: 15 },
  ];

  it('affiche les indices déjà débloqués avec leur texte et leur coût', () => {
    const unlockedHints: LabUnlockedHint[] = [
      { index: 1, costPercent: 10, text: 'Commencer par le réseau de production /26.' },
    ];
    const onConsumeHint = vi.fn();

    render(
      <LabHints
        unlockedHints={unlockedHints}
        totalHints={2}
        hintsSummary={hintsSummary}
        isSessionActive={true}
        onConsumeHint={onConsumeHint}
      />
    );

    expect(screen.getByText(/Système d'indices \(1 \/ 2 utilisés\)/i)).toBeDefined();
    expect(screen.getByText(/Commencer par le réseau de production \/26\./i)).toBeDefined();
    expect(screen.getByText(/Indice 1 \(Coût : -10%\)/i)).toBeDefined();
  });

  it('permet de débloquer le prochain indice en cliquant sur le bouton', async () => {
    const unlockedHints: LabUnlockedHint[] = [];
    const onConsumeHint = vi.fn().mockResolvedValue(undefined);

    render(
      <LabHints
        unlockedHints={unlockedHints}
        totalHints={2}
        hintsSummary={hintsSummary}
        isSessionActive={true}
        onConsumeHint={onConsumeHint}
      />
    );

    const unlockButton = screen.getByRole('button', { name: /Révéler l'indice/i });
    expect(unlockButton).toBeDefined();
    await React.act(async () => {
      fireEvent.click(unlockButton);
    });
    expect(onConsumeHint).toHaveBeenCalledTimes(1);
  });

  it('masque le bouton si tous les indices ont été débloqués', () => {
    const unlockedHints: LabUnlockedHint[] = [
      { index: 1, costPercent: 10, text: 'Indice 1' },
      { index: 2, costPercent: 15, text: 'Indice 2' },
    ];
    const onConsumeHint = vi.fn();

    render(
      <LabHints
        unlockedHints={unlockedHints}
        totalHints={2}
        hintsSummary={hintsSummary}
        isSessionActive={true}
        onConsumeHint={onConsumeHint}
      />
    );

    expect(screen.queryByRole('button', { name: /Révéler l'indice/i })).toBeNull();
    expect(screen.getByText(/Tous les indices de ce lab ont été consultés\./i)).toBeDefined();
  });
});
