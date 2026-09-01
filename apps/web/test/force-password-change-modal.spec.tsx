import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForcePasswordChangeModal } from '../components/auth/force-password-change-modal';

const mockChangePassword = vi.fn();
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ForcePasswordChangeModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne s\'affiche pas si l\'utilisateur n\'est pas connecté ou mustChangePassword=false', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@opensio.local', mustChangePassword: false },
      changePassword: mockChangePassword,
      logout: mockLogout,
    });

    const { container } = render(<ForcePasswordChangeModal />);
    expect(container.firstChild).toBeNull();
  });

  it('s\'affiche lorsque mustChangePassword=true', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@opensio.local', mustChangePassword: true },
      changePassword: mockChangePassword,
      logout: mockLogout,
    });

    render(<ForcePasswordChangeModal />);
    expect(screen.getByText('Changement de mot de passe obligatoire')).toBeDefined();
    expect(screen.getByPlaceholderText('Entrez le mot de passe temporaire')).toBeDefined();
  });

  it('affiche le bouton désactivé si les critères ou la confirmation ne correspondent pas', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@opensio.local', mustChangePassword: true },
      changePassword: mockChangePassword,
      logout: mockLogout,
    });

    render(<ForcePasswordChangeModal />);

    const currentPassInput = screen.getByPlaceholderText('Entrez le mot de passe temporaire');
    const newPassInput = screen.getByPlaceholderText('Nouveau mot de passe fort');
    const confirmPassInput = screen.getByPlaceholderText('Répétez le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: /Valider le mot de passe/i });

    fireEvent.change(currentPassInput, { target: { value: 'TempPass123!' } });
    fireEvent.change(newPassInput, { target: { value: 'NewSuperPass456!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'MismatchPass456!' } });

    expect(submitBtn.hasAttribute('disabled')).toBe(true);
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('soumet le changement de mot de passe avec succès lorsque le formulaire est valide', async () => {
    mockChangePassword.mockResolvedValueOnce({ success: true });
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@opensio.local', mustChangePassword: true },
      changePassword: mockChangePassword,
      logout: mockLogout,
    });

    render(<ForcePasswordChangeModal />);

    const currentPassInput = screen.getByPlaceholderText('Entrez le mot de passe temporaire');
    const newPassInput = screen.getByPlaceholderText('Nouveau mot de passe fort');
    const confirmPassInput = screen.getByPlaceholderText('Répétez le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: /Valider le mot de passe/i });

    fireEvent.change(currentPassInput, { target: { value: 'TempPass123!' } });
    fireEvent.change(newPassInput, { target: { value: 'NewSuperPass456!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'NewSuperPass456!' } });

    expect(submitBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('TempPass123!', 'NewSuperPass456!');
    });
  });
});
