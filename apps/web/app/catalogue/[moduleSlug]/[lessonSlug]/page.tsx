'use client';

import React, { useEffect, use } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft, ListOrdered } from 'lucide-react';
import { useAuth } from '../../../../lib/auth/use-auth';
import {
  fetchLesson,
  fetchModule,
  type LessonDetail,
  type ModuleDetail,
} from '../../../../lib/api/catalog-api';
import { Breadcrumbs } from '../../../../components/layout/breadcrumbs';
import { LessonHeader } from '../../../../components/lessons/lesson-header';
import { LessonMetadata } from '../../../../components/lessons/lesson-metadata';
import { MarkdownRenderer } from '../../../../components/lessons/markdown-renderer';
import { LessonCompleteButton } from '../../../../components/lessons/lesson-complete-button';
import { LessonNavigation } from '../../../../components/lessons/lesson-navigation';
import { LessonModuleSidebar } from '../../../../components/lessons/lesson-module-sidebar';
import { useLessonHeartbeat } from '../../../../lib/hooks/use-lesson-heartbeat';
import { useSidebarState } from '../../../../lib/hooks/use-sidebar-state';
import LessonDetailLoading from './loading';

interface LessonPageProps {
  params: Promise<{
    moduleSlug: string;
    lessonSlug: string;
  }>;
}

export default function LessonDetailPage({ params }: LessonPageProps) {
  const resolvedParams = use(params);
  const { moduleSlug, lessonSlug } = resolvedParams;

  const { accessToken } = useAuth();
  const [lessonData, setLessonData] = React.useState<LessonDetail | null>(null);
  const [moduleData, setModuleData] = React.useState<ModuleDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // État du sommaire : fermé par défaut sur mobile, préférence localStorage sur desktop
  const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar, toggleButtonRef } = useSidebarState();

  // Suivi actif du temps passé
  useLessonHeartbeat(lessonSlug, accessToken);

  const loadLessonAndModule = async () => {
    if (!accessToken || !lessonSlug || !moduleSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      const [lesson, mod] = await Promise.all([
        fetchLesson(lessonSlug, accessToken),
        fetchModule(moduleSlug, accessToken),
      ]);
      setLessonData(lesson);
      setModuleData(mod);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la leçon.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLessonAndModule();
  }, [accessToken, lessonSlug, moduleSlug]);

  if (isLoading) {
    return <LessonDetailLoading />;
  }

  if (error || !lessonData || !moduleData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-800 dark:text-rose-200">Leçon introuvable</h3>
            <p className="text-sm mt-1 text-rose-700/90 dark:text-rose-300/90">{error || 'La leçon demandée n\'existe pas.'}</p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href={`/catalogue/${moduleSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au module</span>
              </Link>
              <button
                onClick={() => void loadLessonAndModule()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calcul des leçons précédente et suivante dans l'ordre du module
  const lessons = moduleData.lessons || [];
  const currentIndex = lessons.findIndex((l) => l.slug === lessonSlug);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const moduleQuiz = moduleData.quizzes && moduleData.quizzes.length > 0 ? moduleData.quizzes[0] : null;

  const breadcrumbs = [
    { label: lessonData.module.title, href: `/catalogue/${moduleSlug}` },
    { label: lessonData.title },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-8 relative">
      {/* Contenu principal de la leçon */}
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <Breadcrumbs items={breadcrumbs} />

          {/* Bouton rapide d'affichage du sommaire (visible sur tous écrans) */}
          <button
            ref={toggleButtonRef}
            type="button"
            id="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-expanded={isSidebarOpen}
            aria-controls="module-summary-sidebar"
            aria-label={isSidebarOpen ? 'Masquer le sommaire du module' : 'Afficher le sommaire du module'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-sky-600 dark:text-sky-400 transition-colors cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{isSidebarOpen ? 'Masquer le sommaire' : 'Afficher le sommaire'}</span>
          </button>
        </div>

        <LessonHeader lesson={lessonData} />
        <LessonMetadata lesson={lessonData} />

        <article className="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/60 shadow-xl mb-8">
          <MarkdownRenderer content={lessonData.content} />
        </article>

        {/* Barre de complétion de la leçon */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
          <Link
            href={`/catalogue/${moduleSlug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Retour au module</span>
          </Link>

          <LessonCompleteButton
            lessonSlug={lessonSlug}
            isInitiallyCompleted={lessonData.progress?.status === 'completed'}
            completedAt={lessonData.progress?.completedAt}
            token={accessToken}
          />
        </div>

        {/* Boutons de navigation Précédent / Suivant et Raccourcis clavier */}
        <LessonNavigation
          moduleSlug={moduleSlug}
          previousLesson={previousLesson}
          nextLesson={nextLesson}
          quiz={moduleQuiz}
        />
      </div>

      {/* Sommaire latéral du module (repliable / tiroir) */}
      <LessonModuleSidebar
        module={moduleData}
        currentLessonSlug={lessonSlug}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onClose={closeSidebar}
      />
    </div>
  );
}
