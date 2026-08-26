import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProfileRgpd } from '../components/profile/profile-rgpd';
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

describe('ProfileRgpd', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'student@opensio.local' },
      accessToken: 'mock-token',
      logout: mockLogout,
    });
  });

  it('affiche les informations de protection des données RGPD', () => {
    render(<ProfileRgpd />);

    expect(screen.getByText('Protection des données (RGPD)')).toBeDefined();
    expect(screen.getByText(/Zone de danger : Suppression définitive du compte/)).toBeDefined();
  });

  it('ouvre la modale de confirmation et exige le mot SUPPRIMER pour valider', async () => {
    vi.spyOn(profileApi, 'deleteAccountApi').mockResolvedValue({ success: true });

    render(<ProfileRgpd />);

    const deleteTrigger = screen.getByText('Supprimer mon compte définitivement');
    fireEvent.click(deleteTrigger);

    expect(screen.getAllByText('Confirmer la suppression').length).toBeGreaterThan(0);

    const confirmBtn = screen.getByRole('button', { name: /Confirmer la suppression/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    const input = screen.getByPlaceholderText('SUPPRIMER');
    fireEvent.change(input, { target: { value: 'SUPPRIMER' } });

    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(profileApi.deleteAccountApi).toHaveBeenCalledWith('mock-token');
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
