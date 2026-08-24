import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CatalogueLoading from '../app/catalogue/loading';
import ModuleDetailLoading from '../app/catalogue/[moduleSlug]/loading';
import LessonDetailLoading from '../app/catalogue/[moduleSlug]/[lessonSlug]/loading';
import QuizPageLoading from '../app/catalogue/[moduleSlug]/quiz/[quizSlug]/loading';
import DashboardLoading from '../app/dashboard/loading';

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
});
