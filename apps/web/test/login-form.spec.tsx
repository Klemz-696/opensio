import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../components/auth/login-form';

const mockLogin = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => '/catalogue',
  }),
}));

vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    accessToken: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

describe('LoginForm', () => {
  it('affiche les champs email et mot de passe', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText('etudiant@opensio.local')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeDefined();
    expect(screen.getByRole('button', { name: /Se connecter/i })).toBeDefined();
  });

  it('appelle login avec les identifiants saisis', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText('etudiant@opensio.local');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Se connecter/i });

    fireEvent.change(emailInput, { target: { value: 'student@opensio.local' } });
    fireEvent.change(passwordInput, { target: { value: 'StudentPass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('student@opensio.local', 'StudentPass123!');
    });
  });

  it('affiche un message d\'erreur RFC 7807 en cas d\'échec', async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: {
        type: 'AUTH_INVALID_CREDENTIALS',
        title: 'Identifiants invalides',
        status: 401,
        detail: 'Email ou mot de passe incorrect.',
      },
    });

    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText('etudiant@opensio.local');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Se connecter/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@opensio.local' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Identifiants invalides')).toBeDefined();
      expect(screen.getByText('Email ou mot de passe incorrect.')).toBeDefined();
    });
  });
});
