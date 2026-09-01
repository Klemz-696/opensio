import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProfileEditor } from '../components/profile/profile-editor';
import * as profileApi from '../lib/api/profile';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProfileEditor', () => {
  const updateCurrentUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'student@opensio.local',
        displayName: 'Jean Dupont',
        bio: 'Passionné de réseaux',
      },
      accessToken: 'mock-token',
      updateCurrentUser,
    });
  });

  it('affiche les champs pré-remplis avec les données de l\'utilisateur', () => {
    render(<ProfileEditor />);

    expect(screen.getByDisplayValue('Jean Dupont')).toBeDefined();
    expect(screen.getByDisplayValue('Passionné de réseaux')).toBeDefined();
    expect(screen.getByDisplayValue('student@opensio.local')).toBeDefined();
    expect(screen.getByText('20 / 500')).toBeDefined();
  });

  it('met à jour le nom et la bio lors de la soumission', async () => {
    vi.spyOn(profileApi, 'updateProfileApi').mockResolvedValue({
      success: true,
      data: {
        id: 'u1',
        email: 'student@opensio.local',
        displayName: 'Jean Modifié',
        bio: 'Nouvelle biographie complète',
        avatarUrl: null,
        role: 'APPRENANT',
        status: 'ACTIVE',
        mustChangePassword: false,
        preferences: null,
        createdAt: '2026-08-24',
        lastLoginAt: null,
      },
    });

    render(<ProfileEditor />);

    const nameInput = screen.getByDisplayValue('Jean Dupont');
    fireEvent.change(nameInput, { target: { value: 'Jean Modifié' } });

    const bioInput = screen.getByDisplayValue('Passionné de réseaux');
    fireEvent.change(bioInput, { target: { value: 'Nouvelle biographie complète' } });

    const submitBtn = screen.getByText('Enregistrer les modifications');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(profileApi.updateProfileApi).toHaveBeenCalledWith('mock-token', {
        displayName: 'Jean Modifié',
        bio: 'Nouvelle biographie complète',
      });
      expect(updateCurrentUser).toHaveBeenCalledWith({
        displayName: 'Jean Modifié',
        bio: 'Nouvelle biographie complète',
      });
      expect(screen.getByText('Profil mis à jour avec succès.')).toBeDefined();
    });
  });
});
