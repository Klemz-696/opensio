import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { LessonModuleSidebar } from '../components/lessons/lesson-module-sidebar';
import { useSidebarState } from '../lib/hooks/use-sidebar-state';
import type { ModuleDetail } from '../lib/api/catalog-api';

// ── Données de test ──────────────────────────────────────────────────────────

const mockModule: ModuleDetail = {
  id: 'mod-1',
  slug: 'reseaux-fondamentaux',
  title: 'Réseaux fondamentaux',
  description: 'Module de base',
  position: 1,
  difficulty: 2,
  estimatedMinutes: 120,
  competencyRefs: ['B1.1'],
  track: {
    id: 't-1',
    slug: 'annee-1',
    title: '1ère Année BTS SIO',
  },
  lessons: [
    {
      id: 'l-1',
      slug: '01-adressage-ipv4',
      title: 'Adressage IPv4',
      difficulty: 1,
      estimatedMinutes: 30,
      position: 1,
      status: 'completed',
    },
    {
      id: 'l-2',
      slug: '02-modeles-osi',
      title: 'Modèles OSI et TCP/IP',
      difficulty: 2,
      estimatedMinutes: 45,
      position: 2,
      status: 'started',
    },
    {
      id: 'l-3',
      slug: '03-vlsm',
      title: 'Subnetting VLSM',
      difficulty: 3,
      estimatedMinutes: 45,
      position: 3,
      status: null,
    },
  ],
  quizzes: [
    {
      id: 'q-1',
      slug: 'quiz-reseaux',
      title: 'Quiz Réseaux',
      passingScore: 80,
      position: 1,
      questionsCount: 5,
      passed: true,
      bestScore: 100,
    },
  ],
  labs: [
    {
      id: 'lab-1',
      slug: 'plan-adressage-pme',
      title: "Plan d'adressage PME",
      level: 'LEVEL_2_FILES',
      maxScore: 100,
      estimatedMinutes: 45,
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderSidebar(isOpen: boolean, overrides?: { onToggle?: () => void; onClose?: () => void }) {
  return render(
    <LessonModuleSidebar
      module={mockModule}
      currentLessonSlug="02-modeles-osi"
      isOpen={isOpen}
      onToggle={overrides?.onToggle ?? vi.fn()}
      onClose={overrides?.onClose ?? vi.fn()}
    />,
  );
}

// ── Tests existants (contenu & interactions) ─────────────────────────────────

describe('LessonModuleSidebar', () => {
  it('affiche le titre du module, les leçons, le quiz et le lab', () => {
    renderSidebar(true);

    expect(screen.getByText('Réseaux fondamentaux')).toBeDefined();
    expect(screen.getByText('Adressage IPv4')).toBeDefined();
    expect(screen.getByText('Modèles OSI et TCP/IP')).toBeDefined();
    expect(screen.getByText('Subnetting VLSM')).toBeDefined();
    expect(screen.getByText('Quiz Réseaux')).toBeDefined();
    expect(screen.getByText("Plan d'adressage PME")).toBeDefined();
    expect(screen.getByText('1/3 leçons')).toBeDefined();
    expect(screen.getByText('33%')).toBeDefined();
  });

  it('indique la leçon active avec l\'attribut aria-current="page"', () => {
    renderSidebar(true);

    const activeLink = screen.getByText('Modèles OSI et TCP/IP').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');

    const inactiveLink = screen.getByText('Adressage IPv4').closest('a');
    expect(inactiveLink?.getAttribute('aria-current')).toBeNull();
  });

  it('appelle onToggle et onClose lors des interactions utilisateur', () => {
    const handleToggle = vi.fn();
    const handleClose = vi.fn();

    renderSidebar(true, { onToggle: handleToggle, onClose: handleClose });

    const toggleBtn = screen.getByLabelText('Replier le sommaire');
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    // Touche Échap
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // ── Nouveaux tests : état initial, aria, persistance ──────────────────────

  it('le bouton bascule expose aria-expanded=false quand la sidebar est fermée', () => {
    renderSidebar(false);

    // Le bouton flottant mobile/header a aria-expanded
    const toggleBtns = screen.getAllByRole('button', { name: /sommaire/i });
    const toggleBtn = toggleBtns.find((btn) => btn.hasAttribute('aria-expanded'));
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('le bouton bascule expose aria-expanded=true quand la sidebar est ouverte', () => {
    renderSidebar(true);

    // En mode ouvert le bouton de repliement a aria-expanded
    const allBtns = screen.getAllByRole('button');
    const withExpanded = allBtns.filter((btn) => btn.hasAttribute('aria-expanded'));
    expect(withExpanded.length).toBeGreaterThan(0);
    // Tous les boutons aria-expanded présents doivent être à true
    withExpanded.forEach((btn) => {
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });
  });

  it('le bouton bascule pointe sur le bon id via aria-controls', () => {
    renderSidebar(false);

    const allBtns = screen.getAllByRole('button');
    const withControls = allBtns.filter(
      (btn) => btn.getAttribute('aria-controls') === 'module-summary-sidebar',
    );
    expect(withControls.length).toBeGreaterThan(0);
  });

  it('le panneau aside a l\'id attendu pour aria-controls', () => {
    const { container } = renderSidebar(true);
    const aside = container.querySelector('#module-summary-sidebar');
    expect(aside).not.toBeNull();
  });

  it('appelle onClose sur la touche Échap uniquement quand la sidebar est ouverte', () => {
    const handleClose = vi.fn();
    renderSidebar(false, { onClose: handleClose });

    // Sidebar fermée → Échap ne doit PAS appeler onClose
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });
});

// ── Tests useSidebarState : état initial selon viewport ─────────────────────

describe('useSidebarState', () => {
  const ORIGINAL_INNER_WIDTH = window.innerWidth;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: ORIGINAL_INNER_WIDTH,
    });
    localStorage.clear();
  });

  /**
   * Composant de test minimal qui consomme useSidebarState.
   */
  function SidebarConsumer() {
    const { isOpen, toggle, close, toggleButtonRef } = useSidebarState();
    return (
      <div>
        <button
          ref={toggleButtonRef}
          id="toggle"
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls="sidebar-panel"
        >
          Toggle
        </button>
        <div id="sidebar-panel" data-testid="panel" data-open={String(isOpen)}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </div>
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    );
  }

  it('est FERMÉ par défaut sur viewport mobile (< 1024 px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<SidebarConsumer />);

    expect(screen.getByTestId('panel').getAttribute('data-open')).toBe('false');
    expect(screen.getByRole('button', { name: 'Toggle' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('est OUVERT par défaut sur desktop (≥ 1024 px) sans préférence stockée', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    render(<SidebarConsumer />);

    expect(screen.getByTestId('panel').getAttribute('data-open')).toBe('true');
  });

  it('restaure la préférence FERMÉ depuis localStorage sur desktop', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });
    localStorage.setItem('opensio:sidebar:open', 'false');

    render(<SidebarConsumer />);

    expect(screen.getByTestId('panel').getAttribute('data-open')).toBe('false');
  });

  it('persiste la nouvelle préférence dans localStorage lors du toggle', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    render(<SidebarConsumer />);

    // Initialement ouvert (pas de préférence)
    expect(screen.getByTestId('panel').getAttribute('data-open')).toBe('true');

    // Fermer
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    });

    expect(screen.getByTestId('panel').getAttribute('data-open')).toBe('false');
    expect(localStorage.getItem('opensio:sidebar:open')).toBe('false');
  });

  it('NE persiste PAS la préférence sur mobile (< 1024 px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<SidebarConsumer />);

    // Ouvrir manuellement
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    });

    // Sur mobile, localStorage ne doit pas être écrit
    expect(localStorage.getItem('opensio:sidebar:open')).toBeNull();
  });
});
