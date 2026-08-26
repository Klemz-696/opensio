import React from 'react';
import { CheckCircle2, XCircle, Trophy, RefreshCw } from 'lucide-react';
import type { LabVerdict as LabVerdictType } from '../../lib/api/labs-api';

interface LabVerdictProps {
  verdict: LabVerdictType;
  maxScore?: number;
  onRetry?: () => void;
}

export function LabVerdict({ verdict, maxScore = 100, onRetry }: LabVerdictProps) {
  const isSuccess = verdict.passed;

  return (
    <div
      className={`glass-panel rounded-2xl p-6 sm:p-8 border mb-8 ${
        isSuccess
          ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/40'
          : 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/40'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl ${
              isSuccess
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}
          >
            {isSuccess ? (
              <Trophy className="w-7 h-7" />
            ) : (
              <XCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              Résultat de la validation
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isSuccess ? 'Félicitations ! Atelier réussi' : 'Validation incomplète'}
            </h3>
          </div>
        </div>

        {/* Score obtenu */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Score attribué :</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">
            {verdict.score} <span className="text-xs text-slate-500 font-normal">/ {maxScore} pts</span>
          </span>
        </div>
      </div>

      {/* Détail des contrôles validés */}
      <div className="space-y-3 mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Rapport d'exécution des contrôles
        </h4>
        {verdict.checks.map((chk) => (
          <div
            key={chk.id}
            className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
              chk.passed
                ? 'bg-emerald-500/5 dark:bg-emerald-900/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                : 'bg-rose-500/5 dark:bg-rose-900/10 border-rose-500/20 text-rose-900 dark:text-rose-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {chk.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {chk.id}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    chk.passed
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  +{chk.points} pts
                </span>
              </div>
              <p className="text-xs mt-1 text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {chk.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!isSuccess && onRetry && (
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Modifier mes fichiers et réessayer</span>
          </button>
        </div>
      )}
    </div>
  );
}
