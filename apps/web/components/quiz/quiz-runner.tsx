'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Award,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import type { QuizDetail } from '../../lib/api/quiz-api';
import { QuizQuestionItem } from './quiz-question-item';
import { QuizStepper } from './quiz-stepper';
import { QuizReviewStep } from './quiz-review-step';

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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];

  const scrollToTop = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // Ignorer si non implémenté dans l'environnement
      }
    }
  };

  const handleAnswerChange = (questionId: string, choiceIds: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceIds,
    }));
  };

  const answeredCount = Object.values(answers).filter(
    (choices) => choices && choices.length > 0,
  ).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      scrollToTop();
    } else {
      setIsReviewMode(true);
      scrollToTop();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      scrollToTop();
    }
  };

  const handleSelectQuestion = (index: number) => {
    setIsReviewMode(false);
    setCurrentIndex(index);
    scrollToTop();
  };

  const handleGoToReview = () => {
    setIsReviewMode(true);
    scrollToTop();
  };

  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    void onSubmit(answers);
  };

  return (
    <div className="space-y-6">
      {/* En-tête du Quiz avec Stepper pas-à-pas */}
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

        {/* Stepper des questions */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3">
            <span className="font-semibold text-slate-300">
              {isReviewMode
                ? 'Étape de révision finale'
                : `Question ${currentIndex + 1} sur ${totalQuestions} (${progressPercent}% complété)`}
            </span>
            <span className="text-[11px] text-slate-400">
              {answeredCount}/{totalQuestions} répondue{answeredCount > 1 ? 's' : ''}
            </span>
          </div>

          <QuizStepper
            questions={quiz.questions}
            currentIndex={currentIndex}
            isReviewMode={isReviewMode}
            answers={answers}
            onSelectQuestion={handleSelectQuestion}
            onGoToReview={handleGoToReview}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Message d'erreur éventuel en mode direct */}
      {!isReviewMode && error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Erreur</p>
            <p className="text-xs mt-0.5 text-rose-300/90">{error}</p>
          </div>
        </div>
      )}

      {/* Affichage : Soit Écran de révision, soit Question active pas-à-pas */}
      {isReviewMode ? (
        <QuizReviewStep
          quiz={quiz}
          answers={answers}
          onEditQuestion={handleSelectQuestion}
          onBackToQuestions={() => setIsReviewMode(false)}
          onSubmit={handleFinalSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {currentQuestion && (
            <QuizQuestionItem
              question={currentQuestion}
              index={currentIndex}
              selectedAnswers={answers[currentQuestion.id] || []}
              onAnswerChange={handleAnswerChange}
              disabled={isSubmitting}
            />
          )}

          {/* Barre d'action pas-à-pas */}
          <div className="sticky bottom-4 z-20 glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0 || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:cursor-not-allowed text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Précédente</span>
            </button>

            <button
              type="button"
              onClick={handleGoToReview}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
              <span>Revoir mes réponses</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-sky-500/10 cursor-pointer"
              >
                <span>Suivante</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoToReview}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <span>Vérifier & Soumettre</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
