import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ModuleSummary } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface ModuleCardProps {
  module: ModuleSummary;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const diff = formatDifficulty(module.difficulty);
  const progress = module.progress;
  const isCompleted = progress?.isCompleted ?? false;
  const progressPct = progress?.progressPercentage ?? 0;

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${diff.color}`}>
              {diff.label}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Validé</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatDuration(module.estimatedMinutes)}</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors leading-snug mb-2">
          {module.title}
        </h3>

        {module.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {module.description}
          </p>
        )}

        {module.competencyRefs && module.competencyRefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {module.competencyRefs.map((comp) => (
              <span
                key={comp}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-sky-300"
              >
                {comp}
              </span>
            ))}
          </div>
        )}

        {progress !== undefined && progress !== null && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{progress.completedLessons}/{progress.totalLessons} leçons</span>
              <span className={isCompleted ? 'text-emerald-400 font-semibold' : 'text-sky-400'}>
                {progressPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>{module.lessonsCount} leçon{module.lessonsCount > 1 ? 's' : ''}</span>
        </div>

        <Link
          href={`/catalogue/${module.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300 transition-colors cursor-pointer"
        >
          <span>Accéder au module</span>
          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
