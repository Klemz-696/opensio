import type { ProblemDetails } from '../auth/auth-types';

export interface UserFullProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
  mustChangePassword: boolean;
  preferences: {
    theme?: 'dark' | 'light' | 'system';
    soundEffects?: boolean;
    [key: string]: unknown;
  } | null;
  aiPreference?: {
    preferredModel: string | null;
    freeMode: boolean;
  } | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function getProfileApi(
  accessToken: string,
): Promise<{ success: boolean; data?: UserFullProfile; error?: ProblemDetails }> {
  try {
    const res = await fetch('/api/v1/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur',
      detail: 'Impossible de récupérer le profil.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}

export async function updateProfileApi(
  accessToken: string,
  payload: { displayName?: string; bio?: string | null },
): Promise<{ success: boolean; data?: UserFullProfile; error?: ProblemDetails }> {
  try {
    const res = await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur',
      detail: 'Impossible de mettre à jour le profil.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}

export async function uploadAvatarApi(
  accessToken: string,
  file: File,
): Promise<{ success: boolean; avatarUrl?: string; error?: ProblemDetails }> {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch('/api/v1/profile/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, avatarUrl: data.avatarUrl };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur d\'upload',
      detail: 'Échec de l\'upload de la photo de profil.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}

export async function deleteAvatarApi(
  accessToken: string,
): Promise<{ success: boolean; error?: ProblemDetails }> {
  try {
    const res = await fetch('/api/v1/profile/avatar', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      return { success: true };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur',
      detail: 'Impossible de supprimer la photo de profil.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}

export async function updatePreferencesApi(
  accessToken: string,
  payload: {
    theme?: 'dark' | 'light' | 'system';
    soundEffects?: boolean;
    aiFreeMode?: boolean;
    aiPreferredModel?: string | null;
  },
): Promise<{ success: boolean; data?: unknown; error?: ProblemDetails }> {
  try {
    const res = await fetch('/api/v1/profile/preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur',
      detail: 'Impossible de mettre à jour les préférences.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}

export async function deleteAccountApi(
  accessToken: string,
): Promise<{ success: boolean; message?: string; error?: ProblemDetails }> {
  try {
    const res = await fetch('/api/v1/profile', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message };
    }

    const err = await res.json().catch(() => ({
      title: 'Erreur de suppression',
      detail: 'Impossible de supprimer le compte.',
    }));
    return { success: false, error: err };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Erreur de connexion',
      },
    };
  }
}
