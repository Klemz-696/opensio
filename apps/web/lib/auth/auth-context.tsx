'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type {
  AuthConfig,
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
  const [isSingleUserMode, setIsSingleUserMode] = useState<boolean>(false);
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState<boolean>(false);

  // Restauration de session et détection de la configuration d'instance
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        // 1. Récupération de la configuration d'authentification publique
        let singleUser = false;
        try {
          const cfgRes = await fetch('/api/v1/auth/config');
          if (cfgRes.ok) {
            const cfgData: AuthConfig = await cfgRes.json();
            if (isMounted) {
              setIsSingleUserMode(cfgData.singleUserMode);
              setIsRegistrationEnabled(cfgData.registrationEnabled);
            }
            singleUser = cfgData.singleUserMode;
          }
        } catch {
          // Ignorer l'indisponibilité temporaire de la config
        }

        // 2. Restauration de session classique via refreshToken HttpOnly
        const data = await requestSessionRefresh();
        if (isMounted) {
          if (data) {
            setUser(data.user);
            setAccessToken(data.accessToken);
          } else if (singleUser) {
            // Mode mono-utilisateur : tentative de récupération directe de l'admin
            try {
              const meRes = await fetch('/api/v1/auth/me');
              if (meRes.ok) {
                const meUser: AuthUser = await meRes.json();
                setUser(meUser);
              } else {
                setUser(null);
                setAccessToken(null);
              }
            } catch {
              setUser(null);
              setAccessToken(null);
            }
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

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<{ success: boolean; error?: ProblemDetails }> => {
      try {
        const response = await fetch('/api/v1/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ currentPassword, newPassword }),
          credentials: 'include',
        });

        if (response.ok) {
          setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
          return { success: true };
        }

        const errorData: ProblemDetails = await response.json().catch(() => ({
          type: 'about:blank',
          title: 'Erreur',
          status: response.status,
          detail: 'Échec de mise à jour du mot de passe.',
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
    [accessToken],
  );

  const updateCurrentUser = useCallback((partialUser: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : null));
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: Boolean(user && (accessToken || isSingleUserMode)),
    isSingleUserMode,
    isRegistrationEnabled,
    login,
    logout,
    changePassword,
    setAccessToken,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
