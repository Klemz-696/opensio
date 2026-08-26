import React from 'react';
import { Clock, Layers } from 'lucide-react';
import type { ModuleDetail } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface ModuleHeaderProps {
  module: ModuleDetail;
}

export function ModuleHeader({ module }: ModuleHeaderProps) {
  const diff = formatDifficulty(module.difficulty);

  return (
    <div className="glass-panel rounded-2xl p-8 mb-8 border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-950/90 shadow-sm dark:shadow-none">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          {module.track.title}
        </span>

        <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${diff.color}`}>
          Difficulté {module.difficulty}/5 — {diff.label}
        </span>

        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          Estimation : {formatDuration(module.estimatedMinutes)}
        </span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
        {module.title}
      </h1>

      {module.description && (
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed mb-6">
          {module.description}
        </p>
      )}

      {module.competencyRefs && module.competencyRefs.length > 0 && (
        <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Référentiel BTS SIO :</span>
          <div className="flex flex-wrap gap-1.5">
            {module.competencyRefs.map((comp) => (
              <span
                key={comp}
                className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300"
              >
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
