import React, { useState } from 'react';
import { HelpCircle, Lightbulb, AlertTriangle, ChevronRight } from 'lucide-react';
import type { LabUnlockedHint, LabHintSummary } from '../../lib/api/labs-api';

interface LabHintsProps {
  unlockedHints: LabUnlockedHint[];
  totalHints: number;
  hintsSummary: LabHintSummary[];
  isSessionActive: boolean;
  onConsumeHint: () => Promise<void>;
}

export function LabHints({
  unlockedHints,
  totalHints,
  hintsSummary,
  isSessionActive,
  onConsumeHint,
}: LabHintsProps) {
  const [isConsuming, setIsConsuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (totalHints === 0) {
    return null;
  }

  const nextHintIndex = unlockedHints.length;
  const hasMoreHints = nextHintIndex < totalHints;
  const nextHintSummary = hintsSummary[nextHintIndex];

  const handleUnlockNext = async () => {
    if (!isSessionActive || !hasMoreHints) return;
    setError(null);
    setIsConsuming(true);
    try {
      await onConsumeHint();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de débloquer l’indice.');
    } finally {
      setIsConsuming(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Système d'indices ({unlockedHints.length} / {totalHints} utilisés)
          </h2>
        </div>
        <span className="text-xs text-amber-600 dark:text-amber-400/90 font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          Règle RM-05 (Plancher 50%)
        </span>
      </div>

      {/* Liste des indices débloqués */}
      {unlockedHints.length > 0 && (
        <div className="space-y-3 mb-4">
          {unlockedHints.map((hint) => (
            <div
              key={hint.index}
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Indice {hint.index} (Coût : -{hint.costPercent}%)</span>
              </div>
              <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed font-normal">
                {hint.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Bouton de déblocage du prochain indice */}
      {hasMoreHints && isSessionActive && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Débloquer l'indice n°{nextHintIndex + 1}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pénalité sur le score final :{' '}
                <strong className="text-amber-600 dark:text-amber-300">
                  -{nextHintSummary?.costPercent ?? 10}%
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => void handleUnlockNext()}
            disabled={isConsuming}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            {isConsuming ? (
              <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Révéler l'indice</span>
          </button>
        </div>
      )}

      {!hasMoreHints && (
        <p className="text-xs text-slate-500 italic">
          Tous les indices de ce lab ont été consultés.
        </p>
      )}
    </div>
  );
}
