'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Pencil,
  Send,
  Loader2,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import type { QuizDetail } from '../../lib/api/quiz-api';

interface QuizReviewStepProps {
  quiz: QuizDetail;
  answers: Record<string, string[]>;
  onEditQuestion: (index: number) => void;
  onBackToQuestions: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function QuizReviewStep({
  quiz,
  answers,
  onEditQuestion,
  onBackToQuestions,
  onSubmit,
  isSubmitting,
  error,
}: QuizReviewStepProps) {
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.values(answers).filter(
    (choices) => choices && choices.length > 0,
  ).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* En-tête de révision */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Récapitulatif de vos réponses
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Vérifiez attentivement vos choix avant d'envoyer votre quiz pour correction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                unansweredCount === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {unansweredCount === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Toutes les questions sont renseignées ({answeredCount}/{totalQuestions})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>
                    {unansweredCount} question{unansweredCount > 1 ? 's' : ''} sans réponse
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Il vous reste {unansweredCount} question{unansweredCount > 1 ? 's' : ''} non répondue{unansweredCount > 1 ? 's' : ''}. Vous pouvez modifier vos réponses en cliquant sur « Modifier » ou soumettre le quiz tel quel.
            </span>
          </div>
        )}
      </div>

      {/* Message d'erreur éventuel */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Erreur de soumission</p>
            <p className="text-xs mt-0.5 text-rose-300/90">{error}</p>
          </div>
        </div>
      )}

      {/* Liste des questions en révision */}
      <div className="space-y-4">
        {quiz.questions.map((question, index) => {
          const selectedChoiceIds = answers[question.id] || [];
          const isAnswered = selectedChoiceIds.length > 0;
          const selectedChoices = question.choices.filter((c) =>
            selectedChoiceIds.includes(c.id),
          );

          return (
            <div
              key={question.id}
              className={`glass-panel rounded-2xl p-5 sm:p-6 border transition-all ${
                isAnswered
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border ${
                      isAnswered
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    Question {index + 1}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({question.kind === 'single' ? 'Choix unique' : 'Choix multiples'})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onEditQuestion(index)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer border border-slate-700"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>

              {/* Énoncé résumé */}
              <p className="text-xs sm:text-sm text-slate-300 mb-3 line-clamp-2">
                {question.prompt}
              </p>

              {/* Choix sélectionnés */}
              <div className="pt-3 border-t border-slate-800/80">
                {isAnswered ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Votre sélection :
                    </span>
                    <ul className="space-y-1">
                      {selectedChoices.map((choice) => (
                        <li
                          key={choice.id}
                          className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-medium">{choice.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-medium py-1">
                    <HelpCircle className="w-4 h-4" />
                    <span>Aucune réponse sélectionnée</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre d'action finale */}
      <div className="sticky bottom-4 z-20 glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToQuestions}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux questions</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Correction en cours...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Confirmer et soumettre le quiz</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
