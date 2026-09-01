import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AvatarUploader } from '../components/profile/avatar-uploader';
import * as profileApi from '../lib/api/profile';

const mockUseAuth = vi.fn();
vi.mock('../lib/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AvatarUploader', () => {
  const updateCurrentUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', displayName: 'Alexandre SISR', avatarUrl: null },
      accessToken: 'mock-token',
      updateCurrentUser,
    });
  });

  it('affiche le fallback des initiales et le bouton d\'importation initialement', () => {
    render(<AvatarUploader />);

    expect(screen.getByText('AS')).toBeDefined();
    expect(screen.getByText('Photo de profil')).toBeDefined();
    expect(screen.getByText('Importer une image')).toBeDefined();
  });

  it('rejette un fichier dépassant 2 Mo avec un message d\'erreur', () => {
    render(<AvatarUploader />);

    const input = screen.getByLabelText('Sélectionner une photo de profil') as HTMLInputElement;
    const hugeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'huge.png', {
      type: 'image/png',
    });

    fireEvent.change(input, { target: { files: [hugeFile] } });

    expect(
      screen.getByText(/Le fichier est trop volumineux/),
    ).toBeDefined();
  });

  it('rejette un format non autorisé (ex: text/plain)', () => {
    render(<AvatarUploader />);

    const input = screen.getByLabelText('Sélectionner une photo de profil') as HTMLInputElement;
    const txtFile = new File(['text content'], 'doc.txt', {
      type: 'text/plain',
    });

    fireEvent.change(input, { target: { files: [txtFile] } });

    expect(
      screen.getByText(/Format non supporté/),
    ).toBeDefined();
  });

  it('permet l\'upload d\'une image valide et actualise le profil utilisateur', async () => {
    vi.spyOn(profileApi, 'uploadAvatarApi').mockResolvedValue({
      success: true,
      avatarUrl: '/api/v1/users/avatar/avatar_u1_new.png',
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    render(<AvatarUploader />);

    const input = screen.getByLabelText('Sélectionner une photo de profil') as HTMLInputElement;
    const validFile = new File(['image-bytes'], 'avatar.png', {
      type: 'image/png',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    const saveButton = screen.getByText('Enregistrer la photo');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(profileApi.uploadAvatarApi).toHaveBeenCalledWith('mock-token', validFile);
      expect(updateCurrentUser).toHaveBeenCalledWith({
        avatarUrl: '/api/v1/users/avatar/avatar_u1_new.png',
      });
      expect(screen.getByText('Photo de profil mise à jour avec succès !')).toBeDefined();
    });
  });

  it('permet la suppression de l\'avatar existant', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', displayName: 'Alexandre SISR', avatarUrl: '/api/v1/users/avatar/old.png' },
      accessToken: 'mock-token',
      updateCurrentUser,
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(profileApi, 'deleteAvatarApi').mockResolvedValue({ success: true });

    render(<AvatarUploader />);

    const deleteButton = screen.getByText('Supprimer');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(profileApi.deleteAvatarApi).toHaveBeenCalledWith('mock-token');
      expect(updateCurrentUser).toHaveBeenCalledWith({ avatarUrl: null });
      expect(screen.getByText('Photo de profil supprimée.')).toBeDefined();
    });
  });
});
