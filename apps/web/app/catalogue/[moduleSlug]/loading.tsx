import React from 'react';

export default function ModuleDetailLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du module de cours" className="animate-pulse">
      {/* Fil d'Ariane skeleton */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <div className="h-4 bg-slate-800 rounded w-16" />
        <span className="text-slate-700">/</span>
        <div className="h-4 bg-slate-800 rounded w-20" />
        <span className="text-slate-700">/</span>
        <div className="h-4 bg-slate-800 rounded w-36" />
      </div>

      {/* En-tête de module skeleton */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-5 bg-slate-800 rounded-md w-28" />
          <div className="h-5 bg-slate-800 rounded-md w-20" />
          <div className="h-5 bg-slate-800 rounded-md w-24" />
        </div>

        <div className="h-8 bg-slate-800 rounded-lg w-3/4 mb-4 max-w-full" />

        <div className="space-y-2 mb-6 max-w-3xl">
          <div className="h-4 bg-slate-800/80 rounded w-full" />
          <div className="h-4 bg-slate-800/60 rounded w-4/5" />
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
          <div className="h-4 bg-slate-800 rounded w-28" />
          <div className="h-6 bg-slate-800 rounded-md w-14" />
          <div className="h-6 bg-slate-800 rounded-md w-14" />
        </div>
      </div>

      {/* Liste des leçons skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-slate-800 rounded" />
          <div className="h-6 bg-slate-800 rounded w-44" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((lessonId) => (
            <div
              key={lessonId}
              className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-5 bg-slate-800 rounded w-3/5 max-w-full" />
                  <div className="h-3.5 bg-slate-800/60 rounded w-2/5" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-5 bg-slate-800 rounded w-16 hidden sm:block" />
                <div className="w-6 h-6 bg-slate-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz & Labs skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="h-6 bg-slate-800 rounded w-40 mb-4" />
          <div className="glass-panel rounded-xl p-4 border border-slate-800 h-20" />
        </div>
        <div>
          <div className="h-6 bg-slate-800 rounded w-40 mb-4" />
          <div className="glass-panel rounded-xl p-4 border border-slate-800 h-20" />
        </div>
      </div>
    </div>
  );
}
