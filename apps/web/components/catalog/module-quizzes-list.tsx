import React from 'react';
import Link from 'next/link';
import { HelpCircle, Award, PlayCircle, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import type { QuizSummary } from '../../lib/api/catalog-api';

interface ModuleQuizzesListProps {
  moduleSlug: string;
  quizzes: QuizSummary[];
}

export function ModuleQuizzesList({ moduleSlug, quizzes }: ModuleQuizzesListProps) {
  if (!quizzes || quizzes.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Quiz d'auto-évaluation ({quizzes.length})
          </h2>
        </div>
        <span className="text-xs text-amber-600 dark:text-amber-400/90 font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          Validation des acquis (RM-01)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((quiz) => {
          const isPassed = quiz.passed === true;

          return (
            <div
              key={quiz.id}
              className={`p-5 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                isPassed
                  ? 'bg-emerald-500/5 dark:bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40'
                  : 'bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                    {quiz.title}
                  </h3>
                  {isPassed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Réussi ({quiz.bestScore}%)</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {quiz.questionsCount} question{quiz.questionsCount > 1 ? 's' : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Award className="w-3.5 h-3.5" />
                    Seuil requis : {quiz.passingScore}%
                  </span>
                </div>
              </div>

              <Link
                href={`/catalogue/${encodeURIComponent(moduleSlug)}/quiz/${encodeURIComponent(quiz.slug)}`}
                className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md ${
                  isPassed
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10 hover:shadow-amber-500/25'
                }`}
              >
                {isPassed ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Retenter</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Passer le quiz</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
