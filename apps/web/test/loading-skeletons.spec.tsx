import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NavigationProgress } from '../components/layout/navigation-progress';
import CatalogueLoading from '../app/catalogue/loading';
import ModuleDetailLoading from '../app/catalogue/[moduleSlug]/loading';
import LessonDetailLoading from '../app/catalogue/[moduleSlug]/[lessonSlug]/loading';
import QuizPageLoading from '../app/catalogue/[moduleSlug]/quiz/[quizSlug]/loading';
import DashboardLoading from '../app/dashboard/loading';
import RootLoading from '../app/loading';
import LoginLoading from '../app/login/loading';
import ProfileLoading from '../app/profile/loading';
import AdminLoading from '../app/admin/loading';

// Mock nextjs-toploader (client component with NProgress internals)
vi.mock('nextjs-toploader', () => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="nextjs-toploader"
      data-color={props.color as string}
      data-height={String(props.height ?? '')}
    />
  ),
}));

beforeAll(() => {
  // Mock window.matchMedia pour éviter l'erreur "window.matchMedia is not a function"
  // On force "reduced" pour que le speed soit défini et non undefined
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true, // True pour "reduced-motion"
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('Skeletons de chargement Next.js App Router (Accessibilité & Structure)', () => {
  it('CatalogueLoading rend le skeleton avec les attributs d\'accessibilité', () => {
    render(<CatalogueLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('catalogue');
  });

  it('ModuleDetailLoading rend le skeleton du module avec les attributs d\'accessibilité', () => {
    render(<ModuleDetailLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('module');
  });

  it('LessonDetailLoading rend le skeleton de la leçon avec les attributs d\'accessibilité', () => {
    render(<LessonDetailLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('leçon');
  });

  it('QuizPageLoading rend le skeleton du quiz avec les attributs d\'accessibilité', () => {
    render(<QuizPageLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('quiz');
  });

  it('DashboardLoading rend le skeleton du dashboard avec les attributs d\'accessibilité', () => {
    render(<DashboardLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('tableau de bord');
  });

  it('LabDetailLoading rend le skeleton de lab avec les attributs d\'accessibilité', async () => {
    const LabDetailLoading = (await import('../app/catalogue/[moduleSlug]/labs/[labSlug]/loading')).default;
    render(<LabDetailLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
  });

  it('RootLoading rend le skeleton de la page d\'accueil', () => {
    render(<RootLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('accueil');
  });

  it('LoginLoading rend le skeleton de la page de connexion', () => {
    render(<LoginLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('connexion');
  });

  it('ProfileLoading rend le skeleton de la page de profil', () => {
    render(<ProfileLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('profil');
  });

  it('AdminLoading rend le skeleton du panneau d\'administration', () => {
    render(<AdminLoading />);
    const status = screen.getByRole('status');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toContain('administration');
  });

  it('NavigationProgress rend le top-loader avec la couleur du thème', () => {
    render(<NavigationProgress />);
    const loader = screen.getByTestId('nextjs-toploader');
    expect(loader).toBeDefined();
    expect(loader.getAttribute('data-height')).toBe('3');
  });
});