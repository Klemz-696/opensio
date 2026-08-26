import React from 'react';
import { Layers } from 'lucide-react';
import type { TrackSummary, ModuleSummary } from '../../lib/api/catalog-api';
import { ModuleCard } from './module-card';

interface TrackSectionProps {
  track: TrackSummary;
  modules: ModuleSummary[];
}

export function TrackSection({ track, modules }: TrackSectionProps) {
  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {track.title}
            </h2>
          </div>
          {track.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {track.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {modules.length} module{modules.length > 1 ? 's' : ''} disponible{modules.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
          Aucun module publié pour cette année de formation actuellement.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      )}
    </section>
  );
}
