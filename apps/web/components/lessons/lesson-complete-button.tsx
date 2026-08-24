'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2, Award } from 'lucide-react';
import { completeLesson } from '../../lib/api/progress-api';

interface LessonCompleteButtonProps {
  lessonSlug: string;
  isInitiallyCompleted?: boolean;
  completedAt?: string | null;
  token: string | null;
  onStatusChange?: (completed: boolean) => void;
}

export function LessonCompleteButton({
  lessonSlug,
  isInitiallyCompleted = false,
  completedAt,
  token,
  onStatusChange,
}: LessonCompleteButtonProps) {
  const [isCompleted, setIsCompleted] = useState(isInitiallyCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!token || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      await completeLesson(lessonSlug, undefined, token);
      setIsCompleted(true);
      onStatusChange?.(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec de la validation de la leçon.');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  if (isCompleted) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-left">
          <div className="text-sm font-bold text-emerald-200">Leçon validée</div>
          {formattedDate && (
            <div className="text-xs text-emerald-400/80">Terminée le {formattedDate}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => void handleComplete()}
        disabled={isLoading || !token}
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Award className="w-4 h-4 text-sky-200" />
        )}
        <span>Marquer comme terminée</span>
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
