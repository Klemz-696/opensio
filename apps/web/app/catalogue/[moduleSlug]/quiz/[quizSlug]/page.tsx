'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../../../lib/auth/use-auth';
import {
  fetchQuiz,
  submitQuizAttempt,
  type QuizDetail,
  type QuizAttemptResult,
} from '../../../../../lib/api/quiz-api';
import { Breadcrumbs } from '../../../../../components/layout/breadcrumbs';
import { QuizRunner } from '../../../../../components/quiz/quiz-runner';
import { QuizResultView } from '../../../../../components/quiz/quiz-result-view';
import QuizPageLoading from './loading';

interface QuizPageProps {
  params: Promise<{
    moduleSlug: string;
    quizSlug: string;
  }>;
}

export default function QuizPassagePage({ params }: QuizPageProps) {
  const resolvedParams = use(params);
  const { moduleSlug, quizSlug } = resolvedParams;

  const { accessToken } = useAuth();
  const [quizData, setQuizData] = useState<QuizDetail | null>(null);
  const [resultData, setResultData] = useState<QuizAttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadQuiz = async () => {
    if (!accessToken || !quizSlug) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await fetchQuiz(quizSlug, accessToken);
      setQuizData(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Impossible de charger le quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQuiz();
  }, [accessToken, quizSlug]);

  const handleSubmit = async (answers: Record<string, string[]>) => {
    if (!accessToken || !quizSlug || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `attempt-${Date.now()}`;

      const result = await submitQuizAttempt(
        quizSlug,
        answers,
        accessToken,
        idempotencyKey,
      );

      setResultData(result);
      // Remonter en haut de page pour visualiser le score
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la correction.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResultData(null);
    setSubmitError(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return <QuizPageLoading />;
  }

  if (loadError || !quizData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-800 dark:text-rose-200">Quiz introuvable</h3>
            <p className="text-sm mt-1 text-rose-700/90 dark:text-rose-300/90">
              {loadError || 'Le quiz demandé n\'existe pas.'}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href={`/catalogue/${encodeURIComponent(moduleSlug)}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au module</span>
              </Link>
              <button
                type="button"
                onClick={() => void loadQuiz()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: quizData.module.title, href: `/catalogue/${moduleSlug}` },
    { label: quizData.title },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumbs items={breadcrumbs} />

      {resultData ? (
        <QuizResultView
          result={resultData}
          moduleSlug={moduleSlug}
          onRetry={handleRetry}
        />
      ) : (
        <QuizRunner
          quiz={quizData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
        />
      )}
    </div>
  );
}
