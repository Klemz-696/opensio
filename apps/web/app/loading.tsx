import React from 'react';

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la page d'accueil"
      className="min-h-screen flex flex-col items-center justify-center p-6 animate-pulse"
    >
      <div className="max-w-3xl w-full text-center space-y-8 glass-panel p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60">
        {/* Badge skeleton */}
        <div className="flex justify-center">
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-full w-64" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-4/5" />
          <div className="h-12 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl w-3/5" />
        </div>

        {/* Subtitle skeleton */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-full max-w-lg" />
          <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded w-4/5 max-w-md" />
        </div>

        {/* Feature cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-200/70 dark:bg-slate-800/70 rounded w-full" />
              <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-4/5" />
            </div>
          ))}
        </div>

        {/* CTA button skeleton */}
        <div className="flex justify-center pt-2">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        </div>
      </div>
    </div>
  );
}
