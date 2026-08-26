import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../components/theme/theme-provider';
import { ProfilePreferences } from '../components/profile/profile-preferences';
import * as profileApi from '../lib/api/profile';
import { useTheme } from 'next-themes';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Test helper component to consume useTheme
function ThemeConsumer() {
  const { theme, setTheme, systemTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="system-theme">{systemTheme}</span>
      <button type="button" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        Set System
      </button>
    </div>
  );
}

describe('Theme System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
    });
    localStorage.clear();

    // Mock matchMedia for jsdom
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('fournit le thème sombre par défaut au montage avec ThemeProvider', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
  });

  it('permet la bascule instantanée entre clair, sombre et système', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Bascule vers clair
    fireEvent.click(screen.getByText('Set Light'));
    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('light');
    });

    // Bascule vers système
    fireEvent.click(screen.getByText('Set System'));
    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('system');
    });

    // Bascule vers sombre
    fireEvent.click(screen.getByText('Set Dark'));
    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    });
  });

  it('ProfilePreferences met à jour next-themes et synchronise avec l\'API', async () => {
    const updatePrefSpy = vi.spyOn(profileApi, 'updatePreferencesApi').mockResolvedValue({
      success: true,
      data: {},
    });

    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeConsumer />
        <ProfilePreferences
          initialTheme="dark"
          initialSoundEffects={true}
          initialAiFreeMode={false}
          initialAiModel="deepseek-r1:14b"
        />
      </ThemeProvider>,
    );

    // Initialement dark
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');

    // Clic sur le bouton de thème "Clair"
    const lightButton = screen.getByText('Clair');
    fireEvent.click(lightButton);

    // next-themes passe immédiatement à 'light'
    await waitFor(() => {
      expect(screen.getByTestId('current-theme').textContent).toBe('light');
    });

    // Enregistrement des préférences
    const saveBtn = screen.getByText('Enregistrer les préférences');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updatePrefSpy).toHaveBeenCalledWith('mock-token', {
        theme: 'light',
        soundEffects: true,
        aiFreeMode: false,
        aiPreferredModel: 'deepseek-r1:14b',
      });
      expect(screen.getByText('Préférences enregistrées avec succès.')).toBeDefined();
    });
  });
});
