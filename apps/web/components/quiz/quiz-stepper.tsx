'use client';

import React from 'react';
import { Check, ClipboardList } from 'lucide-react';
import type { QuizQuestion } from '../../lib/api/quiz-api';

interface QuizStepperProps {
  questions: QuizQuestion[];
  currentIndex: number;
  isReviewMode: boolean;
  answers: Record<string, string[]>;
  onSelectQuestion: (index: number) => void;
  onGoToReview: () => void;
  disabled?: boolean;
}

export function QuizStepper({
  questions,
  currentIndex,
  isReviewMode,
  answers,
  onSelectQuestion,
  onGoToReview,
  disabled = false,
}: QuizStepperProps) {
  return (
    <nav
      aria-label="Progression du quiz"
      className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2 px-1 scrollbar-none"
    >
      {questions.map((q, index) => {
        const isCurrent = !isReviewMode && currentIndex === index;
        const isAnswered = Boolean(answers[q.id] && answers[q.id].length > 0);

        let badgeClasses = 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200';

        if (isCurrent) {
          badgeClasses = 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 font-bold';
        } else if (isAnswered) {
          badgeClasses = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
        }

        return (
          <button
            type="button"
            key={q.id}
            onClick={() => !disabled && onSelectQuestion(index)}
            disabled={disabled}
            aria-label={`Question ${index + 1}${isAnswered ? ' (répondue)' : ''}${isCurrent ? ' (en cours)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex items-center justify-center min-w-[36px] h-9 px-2.5 rounded-xl border text-xs transition-all cursor-pointer ${badgeClasses} ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="flex items-center gap-1">
              <span>{index + 1}</span>
              {isAnswered && !isCurrent && (
                <Check className="w-3 h-3 text-emerald-400" />
              )}
            </span>
          </button>
        );
      })}

      {/* Onglet Récapitulatif & Revue */}
      <div className="h-6 w-px bg-slate-800 mx-1 shrink-0" aria-hidden="true" />

      <button
        type="button"
        onClick={() => !disabled && onGoToReview()}
        disabled={disabled}
        aria-label="Récapitulatif des réponses"
        aria-current={isReviewMode ? 'step' : undefined}
        className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs transition-all cursor-pointer shrink-0 ${
          isReviewMode
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 font-bold'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ClipboardList className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Revue</span>
      </button>
    </nav>
  );
}
