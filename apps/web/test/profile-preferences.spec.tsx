import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProfilePreferences } from '../components/profile/profile-preferences';
import * as profileApi from '../lib/api/profile';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProfilePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
    });
  });

  it('affiche les options de préférences (thème, sons, IA) et permet leur modification', async () => {
    vi.spyOn(profileApi, 'updatePreferencesApi').mockResolvedValue({
      success: true,
      data: {},
    });

    render(
      <ProfilePreferences
        initialTheme="dark"
        initialSoundEffects={true}
        initialAiFreeMode={false}
        initialAiModel="deepseek-r1:14b"
      />,
    );

    expect(screen.getByText('Préférences d\'apprentissage & Interface')).toBeDefined();
    expect(screen.getByText('Mentor Pédagogique IA')).toBeDefined();

    // Changement de thème vers "Système"
    const systemBtn = screen.getByText('Système');
    fireEvent.click(systemBtn);

    // Bascule du mode libre IA
    const freeModeCheckbox = screen.getByLabelText('Activer le mode libre (sans filtre pédagogique)');
    fireEvent.click(freeModeCheckbox);

    // Soumission
    const saveBtn = screen.getByText('Enregistrer les préférences');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(profileApi.updatePreferencesApi).toHaveBeenCalledWith('mock-token', {
        theme: 'system',
        soundEffects: true,
        aiFreeMode: true,
        aiPreferredModel: 'deepseek-r1:14b',
      });
      expect(screen.getByText('Préférences enregistrées avec succès.')).toBeDefined();
    });
  });
});
