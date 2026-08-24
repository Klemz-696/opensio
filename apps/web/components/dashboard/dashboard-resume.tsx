import React from 'react';
import Link from 'next/link';
import { PlayCircle, Clock, ArrowRight, BookOpen } from 'lucide-react';
import type { DashboardResumeItem } from '../../lib/api/progress-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface DashboardResumeProps {
  items: DashboardResumeItem[];
}

export function DashboardResume({ items }: DashboardResumeProps) {
  if (!items || items.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 text-center py-10">
        <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Aucune leçon entamée</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Vous n'avez pas encore débuté de leçon. Choisissez un module dans le catalogue pour démarrer votre entraînement.
        </p>
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          <span>Consulter les cours</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Reprendre où j'en étais</h2>
        </div>
        <span className="text-xs text-slate-400">Activités récentes</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const diff = formatDifficulty(item.difficulty);
          const isCompleted = item.status === 'completed';

          return (
            <div
              key={item.lessonId}
              className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-sky-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-sky-400/90 uppercase tracking-wider">
                    {item.moduleTitle}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${diff.color}`}>
                    {diff.label}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors mb-2 leading-snug">
                  {item.lessonTitle}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Durée : {formatDuration(item.estimatedMinutes)}
                  </span>
                  {item.timeSpentSeconds > 0 && (
                    <span>• Passé : {formatDuration(Math.round(item.timeSpentSeconds / 60))}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold ${
                    isCompleted ? 'text-emerald-400' : 'text-sky-400'
                  }`}
                >
                  {isCompleted ? '✓ Déjà terminée' : 'En cours de lecture'}
                </span>

                <Link
                  href={`/catalogue/${item.moduleSlug}/${item.lessonSlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-colors cursor-pointer"
                >
                  <span>{isCompleted ? 'Revoir' : 'Continuer'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
