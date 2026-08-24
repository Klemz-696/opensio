import React from 'react';
import { HelpCircle, Award, Lock } from 'lucide-react';
import type { QuizSummary } from '../../lib/api/catalog-api';

interface ModuleQuizzesListProps {
  quizzes: QuizSummary[];
}

export function ModuleQuizzesList({ quizzes }: ModuleQuizzesListProps) {
  if (!quizzes || quizzes.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">
            Quiz d'auto-évaluation ({quizzes.length})
          </h2>
        </div>
        <span className="text-xs text-amber-400/90 font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          Validation des acquis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
          >
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {quiz.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{quiz.questionsCount} question{quiz.questionsCount > 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Award className="w-3.5 h-3.5" />
                  Score requis : {quiz.passingScore}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-[11px] font-medium text-slate-400 border border-slate-700">
              <Lock className="w-3.5 h-3.5" />
              <span>Passation (Lot 5)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
