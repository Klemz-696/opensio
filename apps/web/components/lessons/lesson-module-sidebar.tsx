'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Terminal,
  X,
  ListOrdered,
} from 'lucide-react';
import type { ModuleDetail } from '../../lib/api/catalog-api';
import { formatDuration } from '../../lib/utils/formatters';

interface LessonModuleSidebarProps {
  module: ModuleDetail;
  currentLessonSlug: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function LessonModuleSidebar({
  module,
  currentLessonSlug,
  isOpen,
  onToggle,
  onClose,
}: LessonModuleSidebarProps) {
  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const totalLessons = module.lessons.length;
  const completedLessons = module.lessons.filter((l) => l.status === 'completed').length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <>
      {/* Bouton bascule flottant / d'en-tête (visible sur mobile ou quand la sidebar est fermée) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="module-summary-sidebar"
        aria-label={isOpen ? 'Masquer le sommaire du module' : 'Afficher le sommaire du module'}
        className={`fixed bottom-6 left-6 z-30 lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700/80 shadow-xl dark:shadow-2xl backdrop-blur-md text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400`}
      >
        <ListOrdered className="w-4 h-4" />
        <span>Sommaire ({completedLessons}/{totalLessons})</span>
      </button>

      {/* Backdrop sombre pour le mode mobile / tiroir */}
      {isOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Panneau latéral / Tiroir */}
      <aside
        id="module-summary-sidebar"
        aria-label="Sommaire du module"
        className={`fixed lg:sticky top-0 lg:top-24 right-0 lg:right-auto bottom-0 z-40 w-80 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 lg:bg-white/80 dark:lg:bg-slate-900/80 border-l lg:border border-slate-200 dark:border-slate-800 lg:rounded-2xl shadow-xl dark:shadow-2xl flex flex-col transition-all duration-300 backdrop-blur-md h-full lg:h-[calc(100vh-8rem)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-12 lg:min-w-[3rem]'
        }`}
      >
        {/* En-tête de la sidebar Desktop repliée */}
        {!isOpen && (
          <div className="hidden lg:flex flex-col items-center py-4 h-full justify-between">
            <button
              type="button"
              onClick={onToggle}
              aria-label="Ouvrir le sommaire du module"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ouvrir le sommaire du module"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="writing-vertical-rl text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2 py-4">
              <span>Sommaire</span>
              <span className="text-sky-600 dark:text-sky-400">{progressPct}%</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
          </div>
        )}

        {/* Contenu complet de la sidebar quand elle est ouverte */}
        {isOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header du sommaire */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="truncate">{module.track.title}</span>
                </div>
                <Link
                  href={`/catalogue/${encodeURIComponent(module.slug)}`}
                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-300 transition-colors line-clamp-1 block"
                  title={module.title}
                >
                  {module.title}
                </Link>

                {/* Progression du module */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{completedLessons}/{totalLessons} leçon{totalLessons > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progressPct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bouton de repliement / fermeture */}
              <button
                type="button"
                onClick={onToggle}
                aria-label="Replier le sommaire"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                <ChevronRight className="w-4 h-4 hidden lg:block" />
                <X className="w-4 h-4 lg:hidden" />
              </button>
            </div>

            {/* Liste scrollable des leçons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-1 block">
                Leçons du parcours
              </span>

              {module.lessons.map((lesson, idx) => {
                const isCurrent = lesson.slug === currentLessonSlug;
                const isCompleted = lesson.status === 'completed';
                const formattedIdx = String(idx + 1).padStart(2, '0');

                return (
                  <Link
                    key={lesson.id}
                    href={`/catalogue/${encodeURIComponent(module.slug)}/${encodeURIComponent(lesson.slug)}`}
                    onClick={() => {
                      // Fermer sur mobile lors d'un clic
                      if (window.innerWidth < 1024) onClose();
                    }}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all group ${
                      isCurrent
                        ? 'bg-sky-500/15 border border-sky-500/40 text-slate-900 dark:text-white font-semibold shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-500/5 dark:bg-slate-900/40 hover:bg-emerald-500/10 dark:hover:bg-slate-800/60 border border-emerald-500/20 text-slate-700 dark:text-slate-300'
                        : 'bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-sky-500 text-slate-950 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : formattedIdx}
                      </div>
                      <span className="truncate">{lesson.title}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>{formatDuration(lesson.estimatedMinutes)}</span>
                    </div>
                  </Link>
                );
              })}

              {/* Éléments annexes : Quiz & Labs */}
              {(module.quizzes.length > 0 || module.labs.length > 0) && (
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-1 block">
                    Évaluations & Pratique
                  </span>

                  {module.quizzes.map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/catalogue/${encodeURIComponent(module.slug)}/quiz/${encodeURIComponent(quiz.slug)}`}
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 text-amber-700 dark:text-amber-300 transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <HelpCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{quiz.title}</span>
                      </div>
                      {quiz.passed && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {quiz.bestScore}%
                        </span>
                      )}
                    </Link>
                  ))}

                  {module.labs.map((lab) => (
                    <Link
                      key={lab.id}
                      href={`/catalogue/${encodeURIComponent(module.slug)}/labs/${encodeURIComponent(lab.slug)}`}
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{lab.title}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {lab.maxScore} pts
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
