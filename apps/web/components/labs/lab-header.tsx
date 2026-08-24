import React from 'react';
import { Terminal, Clock, Trophy, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';
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
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Déjà validé ({lab.bestScore} pts)</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
          <span>Non démarré</span>
        </div>
      );
    }

    switch (session.status) {
      case 'passed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validé avec succès ({session.score} pts)</span>
          </div>
        );
      case 'running':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold animate-pulse">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Session en cours</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Session interrompue</span>
          </div>
        );
      case 'expired':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Session expirée</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Atelier Pratique (Lab)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                {levelInfo.badge}
              </span>
            </div>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 tracking-tight">
        {lab.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Durée estimée : <strong>{formatDuration(lab.estimatedMinutes)}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Score max : <strong>{lab.maxScore} points</strong></span>
        </div>
        {lab.scoring && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Plancher après indices : <strong>{lab.scoring.floorPercent}%</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
