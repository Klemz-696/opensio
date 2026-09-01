import React from 'react';

export default function LoginLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Chargement de la page de connexion"
      className="min-h-screen flex flex-col items-center justify-center p-4 animate-pulse"
    >
      {/* Login card skeleton */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-40" />
          <div className="h-4 bg-slate-200/70 dark:bg-slate-800/70 rounded w-56" />
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-20" />
          <div className="h-11 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg w-full" />
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded w-24" />
          <div className="h-11 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg w-full" />
        </div>

        {/* Submit button */}
        <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />

        {/* Footer link */}
        <div className="flex justify-center">
          <div className="h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded w-36" />
        </div>
      </div>
    </main>
  );
}
