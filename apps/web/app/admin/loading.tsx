import React from 'react';

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du panneau d'administration"
      className="space-y-6 animate-pulse"
    >
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-48" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-64" />
          <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-96" />
        </div>
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-40" />
      </div>

      {/* Table skeleton */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-24 flex-1" />
          ))}
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800/50"
          >
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
            <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded flex-1" />
            <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded w-40" />
            <div className="h-5 bg-slate-200/60 dark:bg-slate-800/60 rounded-full w-20" />
            <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
