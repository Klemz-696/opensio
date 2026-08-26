'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import type { LessonSummary, QuizSummary } from '../../lib/api/catalog-api';

interface LessonNavigationProps {
  moduleSlug: string;
  previousLesson: LessonSummary | null;
  nextLesson: LessonSummary | null;
  quiz?: QuizSummary | null;
}

export function LessonNavigation({
  moduleSlug,
  previousLesson,
  nextLesson,
  quiz,
}: LessonNavigationProps) {
  const router = useRouter();

  // Navigation au clavier : Flèche gauche / droite
  // Garde stricte : inactif dans les champs de saisie, éditeurs, terminaux ou éléments éditables
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignorer si une touche modificatrice est pressée (Alt, Ctrl, Meta, Shift)
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      // Vérification sécurisée de la cible pour éviter d'intercepter la frappe dans un champ
      const target = event.target as HTMLElement | null;
      if (target && typeof target.getAttribute === 'function') {
        const tagName = target.tagName?.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
        const isEditable = Boolean(target.isContentEditable || target.getAttribute('contenteditable') === 'true');
        const isInsideTerminal = Boolean(
          typeof target.closest === 'function' && target.closest('.xterm, [data-terminal="true"]'),
        );
        const role = target.getAttribute('role');
        const isInteractiveRole = role === 'textbox' || role === 'searchbox' || role === 'combobox';

        if (isInput || isEditable || isInsideTerminal || isInteractiveRole) {
          return;
        }
      }

      if (event.key === 'ArrowLeft' && previousLesson) {
        event.preventDefault();
        router.push(`/catalogue/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(previousLesson.slug)}`);
      } else if (event.key === 'ArrowRight' && nextLesson) {
        event.preventDefault();
        router.push(`/catalogue/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(nextLesson.slug)}`);
      }
    },
    [moduleSlug, previousLesson, nextLesson, router],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <nav
      aria-label="Navigation entre leçons"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8"
    >
      {/* Bouton Leçon précédente */}
      {previousLesson ? (
        <Link
          href={`/catalogue/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(previousLesson.slug)}`}
          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 transition-all text-left shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label={`Leçon précédente : ${previousLesson.title}`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>Leçon précédente</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-sm">
              ←
            </kbd>
          </div>
          <div className="flex items-center gap-2">
            {previousLesson.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Leçon terminée" />
            )}
            <span className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
              {previousLesson.title}
            </span>
          </div>
        </Link>
      ) : (
        <div
          aria-hidden="true"
          className="hidden sm:flex p-4 sm:p-5 rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/30 items-center justify-center text-xs text-slate-400"
        >
          <span>Première leçon du module</span>
        </div>
      )}

      {/* Bouton Leçon suivante ou Quiz final */}
      {nextLesson ? (
        <Link
          href={`/catalogue/${encodeURIComponent(moduleSlug)}/${encodeURIComponent(nextLesson.slug)}`}
          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 transition-all text-right sm:items-end shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label={`Leçon suivante : ${nextLesson.title}`}
        >
          <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors mb-2">
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-sm">
              →
            </kbd>
            <span>Leçon suivante</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
              {nextLesson.title}
            </span>
            {nextLesson.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Leçon terminée" />
            )}
          </div>
        </Link>
      ) : quiz ? (
        <Link
          href={`/catalogue/${encodeURIComponent(moduleSlug)}/quiz/${encodeURIComponent(quiz.slug)}`}
          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900 hover:from-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 transition-all text-right sm:items-end shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label={`Dernière leçon terminée. Passer au quiz : ${quiz.title}`}
        >
          <div className="flex items-center justify-end gap-2 text-xs font-semibold text-amber-400 mb-2">
            <span>Dernière leçon — Évaluation finale</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
              Passer le quiz du module
            </span>
          </div>
        </Link>
      ) : (
        <Link
          href={`/catalogue/${encodeURIComponent(moduleSlug)}`}
          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 transition-all text-right sm:items-end shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label="Fin du module, retourner à l'accueil du module"
        >
          <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors mb-2">
            <span>Fin du module</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <span className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition-colors">
            Retour au module
          </span>
        </Link>
      )}
    </nav>
  );
}
