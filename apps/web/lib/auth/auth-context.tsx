'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type {
  AuthContextValue,
  AuthUser,
  LoginResponse,
  ProblemDetails,
} from './auth-types';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Promesse de rafraîchissement partagée pour dédupliquer les requêtes concurrentes (StrictMode, montages multiples)
let inFlightRefreshPromise: Promise<LoginResponse | null> | null = null;

/**
 * Exécute une requête de rafraîchissement de session ou réutilise la promesse en cours.
 * Évite le rejeu concurrent du cookie de rafraîchissement qui déclenche la détection de vol (lot 3).
 */
export async function requestSessionRefresh(): Promise<LoginResponse | null> {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data: LoginResponse = await response.json();
        return data;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // D-09 / RM-13 : Access token conservé EN MÉMOIRE uniquement (jamais localStorage ni sessionStorage)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restauration de session automatique via le cookie HttpOnly de rafraîchissement au montage
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const data = await requestSessionRefresh();
        if (isMounted) {
          if (data) {
            setUser(data.user);
            setAccessToken(data.accessToken);
          } else {
            setUser(null);
            setAccessToken(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: ProblemDetails }> => {
      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        if (response.ok) {
          const data: LoginResponse = await response.json();
          setUser(data.user);
          setAccessToken(data.accessToken);
          return { success: true };
        }

        const errorData: ProblemDetails = await response.json().catch(() => ({
          type: 'about:blank',
          title: 'Erreur de connexion',
          status: response.status,
          detail: 'Identifiants invalides ou service indisponible',
        }));

        return { success: false, error: errorData };
      } catch (err: unknown) {
        return {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            title: 'Erreur réseau',
            status: 0,
            detail: err instanceof Error ? err.message : 'Impossible de contacter le serveur',
          },
        };
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });
    } catch {
      // Ignorer l'erreur réseau lors de la déconnexion
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, [accessToken]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: Boolean(user && accessToken),
    login,
    logout,
    setAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
