import React from 'react';

export default function LessonDetailLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la leçon de cours"
      className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-8 animate-pulse"
    >
      {/* Contenu principal de la leçon */}
      <div className="flex-1 min-w-0 w-full">
        {/* Fil d'Ariane & Action skeleton */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            <span className="text-slate-500 dark:text-slate-400">/</span>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
            <span className="text-slate-500 dark:text-slate-400">/</span>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" />
          </div>
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-36" />
        </div>

        {/* En-tête de leçon skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-32" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
          </div>
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-4/5 mb-3 max-w-full" />
          <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-1/3" />
        </div>

        {/* Métadonnées & Objectifs skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass-panel rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-36 mb-3" />
            <div className="space-y-2">
              <div className="h-3.5 bg-slate-200/70 dark:bg-slate-800/70 rounded w-full" />
              <div className="h-3.5 bg-slate-200/60 dark:bg-slate-800/60 rounded w-5/6" />
              <div className="h-3.5 bg-slate-200/50 dark:bg-slate-800/50 rounded w-4/5" />
            </div>
          </div>
          <div className="glass-panel rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32 mb-3" />
            <div className="space-y-2">
              <div className="h-3.5 bg-slate-200/70 dark:bg-slate-800/70 rounded w-11/12" />
              <div className="h-3.5 bg-slate-200/60 dark:bg-slate-800/60 rounded w-3/4" />
              <div className="h-3.5 bg-slate-200/50 dark:bg-slate-800/50 rounded w-2/3" />
            </div>
          </div>
        </div>

        {/* Corps du cours Markdown skeleton */}
        <article className="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 mb-8 space-y-6">
          <div className="space-y-2.5">
            <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-full" />
            <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-11/12" />
            <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-4/5" />
          </div>

          <div className="pt-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-64 mb-4" />
            <div className="space-y-2.5 mb-6">
              <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-full" />
              <div className="h-4 bg-slate-200/75 dark:bg-slate-800/75 rounded w-5/6" />
              <div className="h-4 bg-slate-200/65 dark:bg-slate-800/65 rounded w-9/12" />
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 h-40 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-14" />
              </div>
              <div className="space-y-2 py-2">
                <div className="h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded w-3/4" />
                <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-1/2" />
                <div className="h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded w-2/3" />
              </div>
            </div>
          </div>
        </article>

        {/* Barre de complétion de la leçon skeleton */}
        <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 mb-8">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32" />
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-44" />
        </div>

        {/* Boutons de navigation Précédent / Suivant skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          <div className="h-24 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4" />
          <div className="h-24 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4" />
        </div>
      </div>

      {/* Sommaire latéral skeleton (Desktop) */}
      <aside className="hidden lg:block w-80 shrink-0 h-[calc(100vh-8rem)] sticky top-24 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-2" />
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-48 mb-4" />
        <div className="space-y-2 pt-2">
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl w-full" />
          <div className="h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl w-full" />
          <div className="h-10 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-full" />
          <div className="h-10 bg-slate-200/40 dark:bg-slate-800/40 rounded-xl w-full" />
          <div className="h-10 bg-slate-200/30 dark:bg-slate-800/30 rounded-xl w-full" />
        </div>
      </aside>
    </div>
  );
}
