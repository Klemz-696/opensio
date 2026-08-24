import type { ProblemDetails } from '../auth/auth-types';

export class ApiError extends Error {
  public readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || 'Une erreur est survenue');
    this.name = 'ApiError';
    this.problem = problem;
  }
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...rest,
    headers: requestHeaders,
    credentials: 'include',
  });

  if (!response.ok) {
    let problem: ProblemDetails;
    try {
      problem = await response.json();
    } catch {
      problem = {
        type: 'about:blank',
        title: 'Erreur HTTP',
        status: response.status,
        detail: `Le serveur a répondu avec le statut HTTP ${response.status}`,
      };
    }
    throw new ApiError(problem);
  }

  return response.json() as Promise<T>;
}
