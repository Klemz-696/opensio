import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Square, Clock } from 'lucide-react';
import type { LabSession } from '../../lib/api/labs-api';

interface LabSessionControlsProps {
  session: LabSession | null;
  isValidating: boolean;
  isStarting: boolean;
  onStartSession: () => Promise<void>;
  onValidateSession: () => Promise<void>;
  onStopSession: () => Promise<void>;
}

export function LabSessionControls({
  session,
  isValidating,
  isStarting,
  onStartSession,
  onValidateSession,
  onStopSession,
}: LabSessionControlsProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!session || session.status !== 'running') {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expiré');
        return;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Prêt à démarrer l'atelier ?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Une session de travail dédiée de 45 minutes sera initialisée avec les fichiers de départ.
          </p>
        </div>
        <button
          onClick={() => void onStartSession()}
          disabled={isStarting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-950/30 cursor-pointer"
        >
          {isStarting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>Démarrer la session de lab</span>
        </button>
      </div>
    );
  }

  const isRunning = session.status === 'running';

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {timeLeft && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Temps restant : <strong>{timeLeft}</strong></span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isRunning && (
          <button
            onClick={() => void onStopSession()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-700 dark:hover:text-rose-200 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Abandonner la session</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={() => void onValidateSession()}
            disabled={isValidating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            {isValidating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isValidating ? 'Validation en cours...' : 'Valider mon travail'}</span>
          </button>
        )}

        {!isRunning && (
          <button
            onClick={() => void onStartSession()}
            disabled={isStarting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Démarrer une nouvelle session</span>
          </button>
        )}
      </div>
    </div>
  );
}
