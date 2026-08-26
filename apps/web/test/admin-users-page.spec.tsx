import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminUsersPage from '../app/admin/users/page';
import { adminApi } from '../lib/api/admin-api';

vi.mock('../lib/api/admin-api', () => ({
  adminApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@opensio.local', displayName: 'Admin Test', role: 'ADMIN' },
    accessToken: 'mock-token',
    isAuthenticated: true,
  }),
}));

const mockUsers = [
  {
    id: 'admin-1',
    email: 'admin@opensio.local',
    displayName: 'Admin Test',
    role: 'ADMIN',
    status: 'ACTIVE',
    mustChangePassword: false,
    createdAt: '2026-08-26T10:00:00.000Z',
    lastLoginAt: '2026-08-26T12:00:00.000Z',
  },
  {
    id: 'student-1',
    email: 'student@opensio.local',
    displayName: 'Student Test',
    role: 'APPRENANT',
    status: 'ACTIVE',
    mustChangePassword: true,
    createdAt: '2026-08-26T10:00:00.000Z',
    lastLoginAt: null,
  },
];

describe('AdminUsersPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.listUsers as any).mockResolvedValue({
      data: {
        items: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });

  it('charge et affiche la liste des utilisateurs et les indicateurs', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Test')).toBeDefined();
      expect(screen.getByText('student@opensio.local')).toBeDefined();
    });

    expect(screen.getByText('Gestion des Utilisateurs')).toBeDefined();
    expect(screen.getByText('Total Comptes')).toBeDefined();
    expect(screen.getByText('Mot de passe temporaire')).toBeDefined();
  });

  it('permet d\'ouvrir le dialogue de création d\'utilisateur', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Test')).toBeDefined();
    });

    const createBtn = screen.getByRole('button', { name: /Créer un utilisateur/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Créer un nouvel utilisateur')).toBeDefined();
    expect(screen.getByPlaceholderText('Ex : Alice Dupont')).toBeDefined();
  });
});
