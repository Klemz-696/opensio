import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import type { ModuleSummary } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface ModuleCardProps {
  module: ModuleSummary;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const diff = formatDifficulty(module.difficulty);

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${diff.color}`}>
            {diff.label}
          </span>
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
