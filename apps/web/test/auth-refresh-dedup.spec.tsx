import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestSessionRefresh } from '../lib/auth/auth-context';

describe('AuthContext — Déduplication des requêtes de rafraîchissement concurrentes (StrictMode)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('déduplique deux appels simultanés de refresh et n\'émet qu\'une seule requête HTTP', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'student@opensio.local',
      displayName: 'Étudiant Démo SISR',
      role: 'student' as const,
    };
    const mockResponseData = {
      accessToken: 'jwt-access-token-sample',
      user: mockUser,
    };

    let fetchCallCount = 0;

    // Simulation d'un délai réseau pour tester la concurrence
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/v1/auth/refresh') {
        fetchCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          ok: true,
          status: 200,
          json: async () => mockResponseData,
        };
      }
      return { ok: false, status: 404 };
    });

    // Lancement de deux appels strictement concurrents (comme lors d'un double montage StrictMode)
    const [result1, result2] = await Promise.all([
      requestSessionRefresh(),
      requestSessionRefresh(),
    ]);

    // Vérification que les deux appels reçoivent les mêmes données
    expect(result1).toEqual(mockResponseData);
    expect(result2).toEqual(mockResponseData);

    // Vérification cruciale : UNE SEULE requête HTTP a été envoyée
    expect(fetchCallCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('permet un nouvel appel après résolution du premier sans bloquer', async () => {
    const mockResponseData = {
      accessToken: 'jwt-access-token-2',
      user: {
        id: 'usr-2',
        email: 'admin@opensio.local',
        displayName: 'Admin',
        role: 'admin' as const,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponseData,
    });

    const res1 = await requestSessionRefresh();
    expect(res1).toEqual(mockResponseData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const res2 = await requestSessionRefresh();
    expect(res2).toEqual(mockResponseData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
