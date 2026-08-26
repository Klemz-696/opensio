import type { ProblemDetails } from '../auth/auth-types';

export interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'APPRENANT' | 'admin' | 'apprenant';
  status: 'ACTIVE' | 'DISABLED';
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface PaginatedUsersResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  displayName: string;
  role: string;
  temporaryPassword?: string;
}

export interface CreateUserResponse {
  user: AdminUserItem;
  temporaryPassword: string;
}

export interface UpdateUserPayload {
  displayName?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
  message: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<{ data?: T; error?: ProblemDetails }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      return { data };
    }

    const error: ProblemDetails = await res.json().catch(() => ({
      type: 'about:blank',
      title: 'Erreur requête',
      status: res.status,
      detail: `Erreur HTTP ${res.status}`,
    }));

    return { error };
  } catch (err: unknown) {
    return {
      error: {
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Impossible de contacter le serveur',
      },
    };
  }
}

export const adminApi = {
  async listUsers(
    accessToken: string | null,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      status?: string;
    },
  ) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = `/api/v1/admin/users${queryString ? `?${queryString}` : ''}`;
    return request<PaginatedUsersResponse>(endpoint, { method: 'GET' }, accessToken);
  },

  async createUser(accessToken: string | null, payload: CreateUserPayload) {
    return request<CreateUserResponse>(
      '/api/v1/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      accessToken,
    );
  },

  async updateUser(accessToken: string | null, id: string, payload: UpdateUserPayload) {
    return request<AdminUserItem>(
      `/api/v1/admin/users/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      accessToken,
    );
  },

  async resetPassword(
    accessToken: string | null,
    id: string,
    payload?: { temporaryPassword?: string },
  ) {
    return request<ResetPasswordResponse>(
      `/api/v1/admin/users/${id}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      accessToken,
    );
  },
};
