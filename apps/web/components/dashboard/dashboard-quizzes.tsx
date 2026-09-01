import React from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import type { DashboardRecentQuiz } from '../../lib/api/progress-api';

interface DashboardQuizzesProps {
  quizzes: DashboardRecentQuiz[];
}

export function DashboardQuizzes({ quizzes }: DashboardQuizzesProps) {
  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="p-6 mb-8 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Derniers résultats de Quiz
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4">
          Vous n'avez pas encore passé de quiz. Testez vos connaissances après avoir lu vos cours !
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Derniers résultats de Quiz</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Historique récent</span>
      </div>

      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const isPassed = quiz.passed;
          const formattedDate = new Date(quiz.completedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={quiz.attemptId}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{quiz.quizTitle}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                        isPassed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {isPassed ? 'Validé' : 'Échoué'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-300">Score : {quiz.score}%</span>
                    <span>•</span>
                    <span>Seuil requis : {quiz.passingScore}%</span>
                    <span>•</span>
                    <span className="text-slate-500">{formattedDate}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/catalogue/${quiz.moduleSlug}/quiz/${quiz.quizSlug}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Retenter</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
