'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const LS_KEY = 'opensio:sidebar:open';
const LG_BREAKPOINT = 1024; // px — doit correspondre au breakpoint Tailwind `lg`

/**
 * Gère l'état ouvert/fermé du sommaire latéral selon la règle UX :
 * - Mobile (< lg) : toujours fermé à l'arrivée sur la page.
 * - Desktop (≥ lg) : restaure la préférence stockée dans localStorage
 *   (ouvert par défaut si aucune préférence n'existe encore).
 * - Navigation entre leçons : l'état n'est PAS réinitialisé (hook stable
 *   entre re-renders grâce à l'initialisation lazy de useState).
 *
 * @returns isOpen, toggle, close, et une ref à placer sur le bouton
 *   d'ouverture pour que l'Échap puisse y renvoyer le focus.
 */
export function useSidebarState() {
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    // SSR : pas de window, on démarre fermé (le useEffect corrigera côté client)
    if (typeof window === 'undefined') return false;
    if (window.innerWidth < LG_BREAKPOINT) return false;
    // Desktop : lire la préférence ou ouvrir par défaut
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // Synchronisation localStorage (desktop uniquement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= LG_BREAKPOINT) {
      try {
        localStorage.setItem(LS_KEY, String(isOpen));
      } catch {
        // localStorage indisponible (mode privé strict, etc.) — silencieux
      }
    }
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Rendre le focus au bouton d'ouverture pour l'accessibilité clavier
    // (exigence WCAG 2.1 SC 2.1.2 — pas de piège clavier)
    requestAnimationFrame(() => {
      toggleButtonRef.current?.focus();
    });
  }, []);

  return { isOpen, toggle, close, toggleButtonRef };
}
