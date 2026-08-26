import React from 'react';
import {
  Terminal,
  Clock,
  Trophy,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import type { LabPublicDetail, LabSession } from '../../lib/api/labs-api';
import { formatDuration, formatLabLevel } from '../../lib/utils/formatters';

interface LabHeaderProps {
  lab: LabPublicDetail;
  session: LabSession | null;
}

export function LabHeader({ lab, session }: LabHeaderProps) {
  const levelInfo = formatLabLevel(lab.level);

  const getStatusBadge = () => {
    if (!session) {
      if (lab.isCompleted) {
        return (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Validé ({lab.bestScore} pts)</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-medium">
          <span>Non démarré</span>
        </div>
      );
    }

    switch (session.status) {
      case 'passed':
        return (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Validé avec succès ({session.score} pts)</span>
          </div>
        );
      case 'running':
        return (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold animate-pulse shadow-sm">
            <PlayCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Session en cours</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Session interrompue</span>
          </div>
        );
      case 'expired':
        return (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Session expirée</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 shadow-md dark:shadow-2xl mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Atelier Pratique (Lab)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                {levelInfo.badge}
              </span>
            </div>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
        {lab.title}
      </h1>

      {/* Cartouche Temps & Points */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Temps estimé</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatDuration(lab.estimatedMinutes)}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Points max</span>
          </div>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-300">
            {lab.maxScore} points
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Plancher note</span>
          </div>
          <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
            {lab.scoring ? `${lab.scoring.floorPercent}%` : '50%'}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Indices</span>
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {lab.hintsCount} disponible{lab.hintsCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
