import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminRoute } from '../components/auth/admin-route';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AdminRoute Component (RBAC Front)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche l\'état de chargement quand auth est en cours de chargement', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    });

    render(
      <AdminRoute>
        <div>Contenu Secret Admin</div>
      </AdminRoute>,
    );

    expect(screen.getByText('Vérification des privilèges administrateur...')).toBeDefined();
    expect(screen.queryByText('Contenu Secret Admin')).toBeNull();
  });

  it('redirige vers /login si l\'utilisateur n\'est pas connecté', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <AdminRoute>
        <div>Contenu Secret Admin</div>
      </AdminRoute>,
    );

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fadmin%2Fusers');
    expect(screen.queryByText('Contenu Secret Admin')).toBeNull();
  });

  it('affiche un message d\'accès restreint si l\'utilisateur n\'est pas administrateur', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', role: 'APPRENANT', displayName: 'Élève' },
    });

    render(
      <AdminRoute>
        <div>Contenu Secret Admin</div>
      </AdminRoute>,
    );

    expect(screen.getByText('Accès Restreint')).toBeDefined();
    expect(screen.getByText(/Cette section nécessite des privilèges d'administrateur/i)).toBeDefined();
    expect(screen.queryByText('Contenu Secret Admin')).toBeNull();
  });

  it('affiche le contenu protégé si l\'utilisateur a le rôle ADMIN', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'admin-1', role: 'ADMIN', displayName: 'Admin' },
    });

    render(
      <AdminRoute>
        <div>Contenu Secret Admin</div>
      </AdminRoute>,
    );

    expect(screen.getByText('Contenu Secret Admin')).toBeDefined();
  });
});
