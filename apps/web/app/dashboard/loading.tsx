import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto py-4 space-y-8" role="status" aria-busy="true" aria-label="Chargement du tableau de bord">
      {/* Header skeleton */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-800/80 rounded-full w-48" />
        <div className="h-10 bg-slate-800/80 rounded-xl w-80" />
        <div className="h-4 bg-slate-800/80 rounded-lg w-full max-w-lg" />
        <div className="flex gap-3 pt-2">
          <div className="h-8 bg-slate-800/80 rounded-lg w-36" />
          <div className="h-8 bg-slate-800/80 rounded-lg w-32" />
          <div className="h-8 bg-slate-800/80 rounded-lg w-40" />
        </div>
      </div>

      {/* 4 Stats Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 bg-slate-800/80 rounded w-24" />
                <div className="h-8 bg-slate-800/80 rounded w-16" />
              </div>
              <div className="w-10 h-10 bg-slate-800/80 rounded-xl" />
            </div>
            <div className="h-2 bg-slate-800/80 rounded-full w-full" />
            <div className="h-3 bg-slate-800/80 rounded w-32" />
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-800/80 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-28 bg-slate-800/50 rounded-xl" />
              <div className="h-28 bg-slate-800/50 rounded-xl" />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-800/80 rounded w-48" />
            <div className="h-32 bg-slate-800/50 rounded-xl" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-800/80 rounded w-40" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-16 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
