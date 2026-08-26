import React from 'react';
import Link from 'next/link';
import { Terminal, Clock, Play, ChevronRight } from 'lucide-react';
import type { LabSummary } from '../../lib/api/catalog-api';
import { formatDuration, formatLabLevel } from '../../lib/utils/formatters';

interface ModuleLabsListProps {
  moduleSlug?: string;
  labs: LabSummary[];
}

export function ModuleLabsList({ moduleSlug, labs }: ModuleLabsListProps) {
  if (!labs || labs.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Labs pratiques associés ({labs.length})
          </h2>
        </div>
        <span className="text-xs text-emerald-700 dark:text-emerald-400/90 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Entraînement pratique
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {labs.map((lab) => {
          const levelInfo = formatLabLevel(lab.level);
          const labHref = moduleSlug
            ? `/catalogue/${moduleSlug}/labs/${lab.slug}`
            : `#`;

          return (
            <div
              key={lab.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    {levelInfo.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {lab.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatDuration(lab.estimatedMinutes)}
                  </span>
                  <span>•</span>
                  <span>{lab.maxScore} points</span>
                </div>
              </div>

              {moduleSlug ? (
                <Link
                  href={labHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-700 dark:fill-emerald-300" />
                  <span>Démarrer</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <span>Prêt</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
