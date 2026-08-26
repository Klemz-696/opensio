import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from '../components/layout/navbar';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

describe('Navbar (Conditionnement du lien Administration)', () => {
  it('n\'affiche pas le lien Administration pour un apprenant', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', displayName: 'Élève SISR', role: 'APPRENANT' },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    render(<Navbar />);
    expect(screen.queryByText('Administration')).toBeNull();
  });

  it('affiche le lien Administration pour un administrateur', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', displayName: 'Admin SISR', role: 'ADMIN' },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    render(<Navbar />);
    expect(screen.getByText('Administration')).toBeDefined();
  });
});
