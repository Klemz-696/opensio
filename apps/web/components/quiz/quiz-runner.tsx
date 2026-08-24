import React, { useState } from 'react';
import {
  HelpCircle,
  Award,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { QuizDetail } from '../../lib/api/quiz-api';
import { QuizQuestionItem } from './quiz-question-item';

interface QuizRunnerProps {
  quiz: QuizDetail;
  onSubmit: (answers: Record<string, string[]>) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export function QuizRunner({
  quiz,
  onSubmit,
  isSubmitting,
  error,
}: QuizRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const handleAnswerChange = (questionId: string, choiceIds: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceIds,
    }));
  };

  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.values(answers).filter(
    (choices) => choices && choices.length > 0,
  ).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    void onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* En-tête du Quiz */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Module : <span className="text-slate-300 font-medium">{quiz.module.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Award className="w-4 h-4" />
              <span>Seuil de validation : {quiz.passingScore}% (RM-01)</span>
            </span>
          </div>
        </div>

        {/* Barre de progression des réponses */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">
              Progression : {answeredCount} sur {totalQuestions} question{totalQuestions > 1 ? 's' : ''} répondue{answeredCount > 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-amber-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
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

      {/* Liste des questions */}
      <div className="space-y-4">
        {quiz.questions.map((question, index) => (
          <QuizQuestionItem
            key={question.id}
            question={question}
            index={index}
            selectedAnswers={answers[question.id] || []}
            onAnswerChange={handleAnswerChange}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {/* Barre d'action de soumission */}
      <div className="sticky bottom-4 z-20 glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          {answeredCount === totalQuestions ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Toutes les questions sont complétées
            </span>
          ) : (
            <span>
              {totalQuestions - answeredCount} question{(totalQuestions - answeredCount) > 1 ? 's' : ''} restante{(totalQuestions - answeredCount) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <button
          type="submit"
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
              <span>Valider mes réponses</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
