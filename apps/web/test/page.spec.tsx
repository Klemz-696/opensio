import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../app/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    setAccessToken: vi.fn(),
  }),
}));

describe('HomePage', () => {
  it('renders heading and catalogue access links', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByText(/Accéder au Catalogue/i)).toBeDefined();
    expect(screen.getByText(/Se connecter/i)).toBeDefined();
  });
});
