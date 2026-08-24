import React from 'react';

export default function QuizPageLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du quiz"
      className="max-w-4xl mx-auto animate-pulse space-y-6"
    >
      {/* Breadcrumbs Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-16 h-3 bg-slate-800 rounded" />
        <div className="w-3 h-3 bg-slate-800 rounded" />
        <div className="w-32 h-3 bg-slate-800 rounded" />
        <div className="w-3 h-3 bg-slate-800 rounded" />
        <div className="w-24 h-3 bg-slate-800 rounded" />
      </div>

      {/* Quiz Header Skeleton */}
      <div className="glass-panel rounded-2xl p-8 border border-slate-800 bg-slate-900/60 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800" />
            <div className="space-y-2">
              <div className="w-48 h-6 bg-slate-800 rounded-lg" />
              <div className="w-32 h-3 bg-slate-800/60 rounded" />
            </div>
          </div>
          <div className="w-36 h-8 bg-slate-800 rounded-xl" />
        </div>
        <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
          <div className="flex justify-between">
            <div className="w-32 h-3 bg-slate-800 rounded" />
            <div className="w-8 h-3 bg-slate-800 rounded" />
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Question Cards Skeleton */}
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-900/60 mb-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800" />
              <div className="w-24 h-4 bg-slate-800 rounded" />
            </div>
            <div className="w-20 h-5 bg-slate-800 rounded-full" />
          </div>

          <div className="space-y-2 py-2">
            <div className="w-3/4 h-4 bg-slate-800 rounded" />
            <div className="w-1/2 h-4 bg-slate-800/70 rounded" />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((c) => (
              <div
                key={c}
                className="w-full h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center px-4 gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-slate-800" />
                <div className="w-48 h-3 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
