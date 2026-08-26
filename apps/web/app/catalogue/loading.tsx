import React from 'react';

export default function CatalogueLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du catalogue de formation" className="animate-pulse">
      {/* En-tête de page skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50" />
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-lg w-80 sm:w-96 max-w-full" />
        </div>
        <div className="space-y-2 max-w-2xl">
          <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-full" />
          <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded w-3/4" />
        </div>
      </div>

      {/* Section Année 1 skeleton */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800/80">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-64" />
        </div>

        {/* Grille de cartes de modules skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((cardId) => (
            <div
              key={cardId}
              className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex flex-col justify-between h-72"
            >
              <div>
                {/* Badges en-tête */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                </div>

                {/* Titre & Description */}
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-4/5 mb-3" />
                <div className="space-y-2 mb-4">
                  <div className="h-3.5 bg-slate-200/70 dark:bg-slate-800/70 rounded w-full" />
                  <div className="h-3.5 bg-slate-200/60 dark:bg-slate-800/60 rounded w-5/6" />
                  <div className="h-3.5 bg-slate-200/50 dark:bg-slate-800/50 rounded w-2/3" />
                </div>
              </div>

              {/* Pied de carte */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                </div>
                <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
