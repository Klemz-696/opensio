import React from 'react';
import { Terminal, Clock, Lock } from 'lucide-react';
import type { LabSummary } from '../../lib/api/catalog-api';
import { formatDuration, formatLabLevel } from '../../lib/utils/formatters';

interface ModuleLabsListProps {
  labs: LabSummary[];
}

export function ModuleLabsList({ labs }: ModuleLabsListProps) {
  if (!labs || labs.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">
            Labs pratiques associés ({labs.length})
          </h2>
        </div>
        <span className="text-xs text-emerald-400/90 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Entraînement pratique
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {labs.map((lab) => {
          const levelInfo = formatLabLevel(lab.level);

          return (
            <div
              key={lab.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    {levelInfo.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {lab.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatDuration(lab.estimatedMinutes)}
                  </span>
                  <span>•</span>
                  <span>{lab.maxScore} points</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-[11px] font-medium text-slate-400 border border-slate-700">
                <Lock className="w-3.5 h-3.5" />
                <span>Exécution (Lot 7)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
