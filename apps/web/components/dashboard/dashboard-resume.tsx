import React from 'react';
import Link from 'next/link';
import { PlayCircle, Clock, ArrowRight, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
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
          Vous n&apos;avez pas encore débuté de leçon. Choisissez un module dans le catalogue pour démarrer votre entraînement.
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

  // Identifier la dernière leçon consultée non terminée (status === 'started')
  const inProgressItem = items.find((item) => item.status === 'started');
  const otherItems = items.filter((item) => item.lessonId !== inProgressItem?.lessonId);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 space-y-6">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Reprendre où tu t&apos;es arrêté</h2>
        </div>
        <span className="text-xs text-slate-400">Activités récentes</span>
      </div>

      {/* Carte prioritaire : Dernière leçon non terminée */}
      {inProgressItem && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-950/40 via-slate-900/90 to-slate-950 border border-sky-500/30 shadow-xl relative overflow-hidden group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>En cours de révision</span>
                </span>
                <span className="text-xs text-slate-400">
                  Module : <strong className="text-slate-300">{inProgressItem.moduleTitle}</strong>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                {inProgressItem.lessonTitle}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${formatDifficulty(inProgressItem.difficulty).color}`}>
                  {formatDifficulty(inProgressItem.difficulty).label}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Durée : {formatDuration(inProgressItem.estimatedMinutes)}
                </span>
                {inProgressItem.timeSpentSeconds > 0 && (
                  <span>Temps passé : {formatDuration(Math.round(inProgressItem.timeSpentSeconds / 60))}</span>
                )}
              </div>
            </div>

            <Link
              href={`/catalogue/${encodeURIComponent(inProgressItem.moduleSlug)}/${encodeURIComponent(inProgressItem.lessonSlug)}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/20 shrink-0 cursor-pointer"
            >
              <span>Reprendre la leçon</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Liste des autres activités récentes */}
      {otherItems.length > 0 && (
        <div className="space-y-3">
          {inProgressItem && (
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
              Autres activités récentes
            </h4>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherItems.map((item) => {
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

                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors mb-2 leading-snug">
                      {item.lessonTitle}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatDuration(item.estimatedMinutes)}
                      </span>
                      {item.timeSpentSeconds > 0 && (
                        <span>• {formatDuration(Math.round(item.timeSpentSeconds / 60))}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        isCompleted ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Terminée</span>
                        </>
                      ) : (
                        <span>En cours</span>
                      )}
                    </span>

                    <Link
                      href={`/catalogue/${encodeURIComponent(item.moduleSlug)}/${encodeURIComponent(item.lessonSlug)}`}
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
      )}
    </div>
  );
}
