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

describe('Navbar (Affichage Avatar et Lien Profil)', () => {
  it('affiche les initiales en fallback quand l\'utilisateur n\'a pas d\'avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', displayName: 'Lucas Bernard', role: 'APPRENANT', avatarUrl: null },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    render(<Navbar />);
    expect(screen.getByText('LB')).toBeDefined();
    expect(screen.getByText('Lucas Bernard')).toBeDefined();

    const profileLink = screen.getByTitle('Mon profil et préférences');
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('affiche l\'image de l\'avatar quand avatarUrl est défini', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u2',
        displayName: 'Emma Laurent',
        role: 'APPRENANT',
        avatarUrl: '/api/v1/users/avatar/avatar_u2_test.png',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    });

    render(<Navbar />);
    const avatarImg = screen.getByAltText('Emma Laurent');
    expect(avatarImg).toBeDefined();
    expect(avatarImg.getAttribute('src')).toBe('/api/v1/users/avatar/avatar_u2_test.png');
  });
});
