'use client';

import NextTopLoader from 'nextjs-toploader';

/**
 * Barre de progression linéaire en haut de page lors des navigations.
 * Animation instantanée si l'utilisateur préfère un mouvement réduit.
 */
export function NavigationProgress() {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <NextTopLoader
      color="hsl(199 89% 48%)"
      height={3}
      showSpinner={false}
      shadow={false}
      speed={reduced ? 1 : 200}
    />
  );
}