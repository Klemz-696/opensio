import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DashboardHeader } from '../components/dashboard/dashboard-header';
import { DashboardStats } from '../components/dashboard/dashboard-stats';
import { DashboardResume } from '../components/dashboard/dashboard-resume';
import { DashboardRecommendations } from '../components/dashboard/dashboard-recommendations';
import { DashboardTracks } from '../components/dashboard/dashboard-tracks';
import { DashboardQuizzes } from '../components/dashboard/dashboard-quizzes';
import { DashboardActivity } from '../components/dashboard/dashboard-activity';
import type { DashboardData } from '../lib/api/progress-api';

const mockDashboardData: DashboardData = {
  overview: {
    totalLessons: 10,
    completedLessons: 4,
    progressPercentage: 40,
    totalTimeSpentSeconds: 3600,
    totalModules: 2,
    completedModules: 1,
    quizzesPassed: 1,
    totalQuizzes: 2,
  },
  tracksProgress: [
    {
      trackId: 't-1',
      trackSlug: 'annee-1',
      title: '1ère Année BTS SIO SISR',
      totalLessons: 10,
      completedLessons: 4,
      progressPercentage: 40,
      modulesCount: 2,
      completedModulesCount: 1,
    },
  ],
  resume: [
    {
      lessonId: 'l-1',
      lessonSlug: 'adressage-ipv4',
      lessonTitle: 'Adressage IPv4',
      moduleSlug: 'reseaux-fondamentaux',
      moduleTitle: 'Réseaux fondamentaux',
      trackSlug: 'annee-1',
      difficulty: 2,
      estimatedMinutes: 45,
      status: 'started',
      timeSpentSeconds: 1800,
      updatedAt: '2026-08-24T12:00:00Z',
    },
  ],
  recentQuizzes: [
    {
      attemptId: 'att-1',
      quizId: 'q-1',
      quizSlug: 'quiz-adressage',
      quizTitle: 'Quiz Adressage',
      moduleSlug: 'reseaux-fondamentaux',
      score: 100,
      passed: true,
      passingScore: 80,
      completedAt: '2026-08-24T12:30:00Z',
    },
  ],
  recentActivity: [
    {
      id: 'act-1',
      kind: 'LESSON_COMPLETED',
      entityType: 'lesson',
      entityId: 'l-1',
      metadata: { lessonTitle: 'Adressage IPv4', moduleTitle: 'Réseaux fondamentaux' },
      createdAt: '2026-08-24T12:00:00Z',
    },
    {
      id: 'act-2',
      kind: 'QUIZ_PASSED',
      entityType: 'quiz',
      entityId: 'q-1',
      metadata: { quizTitle: 'Quiz Adressage', score: 100 },
      createdAt: '2026-08-24T12:30:00Z',
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      kind: 'continue_module',
      title: 'Continuer le module « Réseaux fondamentaux »',
      description: 'Prochaine leçon : VLSM',
      href: '/catalogue/reseaux-fondamentaux/vlsm',
      priority: 3,
    },
  ],
};

describe('Composants du Tableau de bord (Dashboard)', () => {
  it('DashboardHeader rend le nom de l\'utilisateur et les badges de synthèse', () => {
    render(<DashboardHeader displayName="Lucas SISR" overview={mockDashboardData.overview} />);
    expect(screen.getByText('Lucas SISR')).toBeDefined();
    expect(screen.getByText(/4\/10 leçons terminées/)).toBeDefined();
    expect(screen.getByText(/1\/2 quiz réussis/)).toBeDefined();
  });

  it('DashboardStats affiche les 4 KPI principaux', () => {
    render(<DashboardStats overview={mockDashboardData.overview} />);
    expect(screen.getByText('40%')).toBeDefined();
    expect(screen.getByText('Progression globale')).toBeDefined();
    expect(screen.getByText('Temps d\'apprentissage')).toBeDefined();
    expect(screen.getByText('Quiz validés (RM-01)')).toBeDefined();
    expect(screen.getByText('Modules validés (RM-03)')).toBeDefined();
  });

  it('DashboardResume affiche la section "Reprendre où tu t\'es arrêté" avec la leçon en cours', () => {
    render(<DashboardResume items={mockDashboardData.resume} />);
    expect(screen.getByText(/Reprendre où tu t'es arrêté/i)).toBeDefined();
    expect(screen.getByText('Adressage IPv4')).toBeDefined();
    expect(screen.getByText('Réseaux fondamentaux')).toBeDefined();
    expect(screen.getByText('Reprendre la leçon')).toBeDefined();
  });

  it('DashboardRecommendations affiche les recommandations avec liens d\'action', () => {
    render(<DashboardRecommendations recommendations={mockDashboardData.recommendations} />);
    expect(screen.getByText('Recommandations pédagogiques')).toBeDefined();
    expect(screen.getByText('Continuer le module « Réseaux fondamentaux »')).toBeDefined();
  });

  it('DashboardTracks affiche la progression par track', () => {
    render(<DashboardTracks tracks={mockDashboardData.tracksProgress} />);
    expect(screen.getByText('Progression par Année')).toBeDefined();
    expect(screen.getByText('1ère Année BTS SIO SISR')).toBeDefined();
  });

  it('DashboardQuizzes affiche les résultats des derniers quiz', () => {
    render(<DashboardQuizzes quizzes={mockDashboardData.recentQuizzes} />);
    expect(screen.getByText('Derniers résultats de Quiz')).toBeDefined();
    expect(screen.getByText('Quiz Adressage')).toBeDefined();
    expect(screen.getByText('Validé')).toBeDefined();
  });

  it('DashboardActivity affiche la timeline des actions', () => {
    render(<DashboardActivity events={mockDashboardData.recentActivity} />);
    expect(screen.getByText('Activité récente')).toBeDefined();
    expect(screen.getByText('Leçon terminée : Adressage IPv4')).toBeDefined();
    expect(screen.getByText('Quiz validé : Quiz Adressage')).toBeDefined();
  });
});
