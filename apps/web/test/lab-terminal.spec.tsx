import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LabTerminal } from '../components/labs/lab-terminal';
import * as terminalApi from '../lib/api/terminal-api';

describe('LabTerminal (Composant Frontend & Ergonomie)', () => {
  const mockStatus = {
    active: true,
    sessionId: 'session-123',
    labSlug: 'lab-plan-adressage',
    prompt: 'student@opensio-lab-123:~$ ',
    banner: 'OpenSIO — Terminal Virtuel (Simulation Sécurisée)',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(terminalApi, 'fetchTerminalStatus').mockResolvedValue(mockStatus);
    vi.spyOn(terminalApi, 'executeTerminalCommand').mockResolvedValue({
      stdout: 'eth0: 192.168.1.50/24',
      stderr: '',
      exitCode: 0,
      cwd: '',
    });
  });

  it('affiche le terminal avec la bannière et le statut connecté', async () => {
    render(
      <LabTerminal
        labSlug="lab-plan-adressage"
        sessionId="session-123"
        token="valid-token"
      />
    );

    expect(screen.getByRole('region', { name: /terminal de lab interactif/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Connecté/i)).toBeDefined();
      expect(screen.getByText(/Terminal Virtuel/i)).toBeDefined();
    });
  });

  it('exécute une commande via saisie clavier et affiche la réponse', async () => {
    render(
      <LabTerminal
        labSlug="lab-plan-adressage"
        sessionId="session-123"
        token="valid-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Tapez une commande/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Tapez une commande/i);
    fireEvent.change(input, { target: { value: 'ip a' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(terminalApi.executeTerminalCommand).toHaveBeenCalledWith(
        'lab-plan-adressage',
        'session-123',
        'ip a',
        'valid-token'
      );
      expect(screen.getByText(/192.168.1.50\/24/)).toBeDefined();
    });
  });

  it('exécute une commande rapide via les boutons de raccourcis', async () => {
    render(
      <LabTerminal
        labSlug="lab-plan-adressage"
        sessionId="session-123"
        token="valid-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('ls -la')).toBeDefined();
    });

    const lsBtn = screen.getByText('ls -la');
    fireEvent.click(lsBtn);

    await waitFor(() => {
      expect(terminalApi.executeTerminalCommand).toHaveBeenCalledWith(
        'lab-plan-adressage',
        'session-123',
        'ls -la',
        'valid-token'
      );
    });
  });
});
