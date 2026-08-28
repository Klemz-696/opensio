import React from 'react';

export default function ProfileLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du profil"
      className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-pulse"
    >
      {/* Profile header skeleton */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
            <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-64" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-200/60 dark:bg-slate-800/60 rounded-full w-20" />
              <div className="h-5 bg-slate-200/60 dark:bg-slate-800/60 rounded-full w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg w-28" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-32" />
            <div className="h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg w-full" />
          </div>
        ))}
        <div className="pt-4">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-36" />
        </div>
      </div>
    </div>
  );
}
