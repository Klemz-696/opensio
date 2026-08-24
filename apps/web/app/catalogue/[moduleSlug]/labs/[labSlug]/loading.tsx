import React from 'react';

export default function LabDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto pb-12 animate-pulse" role="status" aria-busy="true">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-20 bg-slate-800 rounded" />
        <div className="h-4 w-4 bg-slate-800 rounded" />
        <div className="h-4 w-32 bg-slate-800 rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-slate-800 rounded" />
              <div className="h-3 w-16 bg-slate-800 rounded" />
            </div>
          </div>
          <div className="h-6 w-24 bg-slate-800 rounded-full" />
        </div>
        <div className="h-8 w-3/4 bg-slate-800 rounded-lg" />
        <div className="flex gap-6 pt-4 border-t border-slate-800">
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-4 w-28 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Controls Skeleton */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-800 rounded" />
          <div className="h-3 w-72 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-44 bg-slate-800 rounded-xl" />
      </div>

      {/* Editor Skeleton */}
      <div className="glass-panel rounded-2xl border border-slate-800 mb-8 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between">
          <div className="h-6 w-28 bg-slate-800 rounded" />
          <div className="h-6 w-20 bg-slate-800 rounded" />
        </div>
        <div className="h-64 bg-slate-950 p-4 space-y-2">
          <div className="h-3 w-1/2 bg-slate-900 rounded" />
          <div className="h-3 w-3/4 bg-slate-900 rounded" />
          <div className="h-3 w-2/3 bg-slate-900 rounded" />
        </div>
      </div>

      {/* Context Skeleton */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="h-20 bg-slate-900/60 rounded-xl" />
      </div>
      <span className="sr-only">Chargement de l'atelier en cours...</span>
    </div>
  );
}
