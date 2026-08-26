import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProfilePage from '../app/profile/page';
import * as profileApi from '../lib/api/profile';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'student@opensio.local',
        displayName: 'Camille Dubois',
        role: 'APPRENANT',
        avatarUrl: null,
        bio: 'Passionné de Linux',
        createdAt: '2026-08-24T10:00:00Z',
        lastLoginAt: '2026-08-26T14:00:00Z',
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
    });

    vi.spyOn(profileApi, 'getProfileApi').mockResolvedValue({
      success: true,
      data: {
        id: 'u1',
        email: 'student@opensio.local',
        displayName: 'Camille Dubois',
        avatarUrl: null,
        bio: 'Passionné de Linux',
        role: 'APPRENANT',
        status: 'ACTIVE',
        mustChangePassword: false,
        preferences: { theme: 'dark', soundEffects: true },
        aiPreference: { preferredModel: 'deepseek-r1:14b', freeMode: false },
        createdAt: '2026-08-24T10:00:00Z',
        lastLoginAt: '2026-08-26T14:00:00Z',
      },
    });
  });

  it('affiche la page de profil et les onglets', async () => {
    render(<ProfilePage />);

    expect(screen.getByText('Profil utilisateur')).toBeDefined();
    expect(screen.getAllByText('Camille Dubois').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profil & Avatar')).toBeDefined();
    expect(screen.getByText('Préférences')).toBeDefined();
    expect(screen.getByText('Sécurité')).toBeDefined();
    expect(screen.getByText('RGPD & Données')).toBeDefined();
  });

  it('permet de naviguer entre les onglets', async () => {
    render(<ProfilePage />);

    const prefTab = screen.getByText('Préférences');
    fireEvent.click(prefTab);

    expect(screen.getByText('Préférences d\'apprentissage & Interface')).toBeDefined();

    const secTab = screen.getByText('Sécurité');
    fireEvent.click(secTab);

    expect(screen.getByText('Sécurité & Mot de passe')).toBeDefined();

    const rgpdTab = screen.getByText('RGPD & Données');
    fireEvent.click(rgpdTab);

    expect(screen.getByText('Protection des données (RGPD)')).toBeDefined();
  });
});
