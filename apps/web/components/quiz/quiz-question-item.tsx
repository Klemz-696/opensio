import React from 'react';
import { Check, HelpCircle } from 'lucide-react';
import type { QuizQuestion } from '../../lib/api/quiz-api';
import { MarkdownRenderer } from '../lessons/markdown-renderer';

interface QuizQuestionItemProps {
  question: QuizQuestion;
  index: number;
  selectedAnswers: string[];
  onAnswerChange: (questionId: string, choiceIds: string[]) => void;
  disabled?: boolean;
}

export function QuizQuestionItem({
  question,
  index,
  selectedAnswers = [],
  onAnswerChange,
  disabled = false,
}: QuizQuestionItemProps) {
  const isSingle = question.kind === 'single';

  const handleSelectChoice = (choiceId: string) => {
    if (disabled) return;

    if (isSingle) {
      onAnswerChange(question.id, [choiceId]);
    } else {
      const exists = selectedAnswers.includes(choiceId);
      const newAnswers = exists
        ? selectedAnswers.filter((id) => id !== choiceId)
        : [...selectedAnswers, choiceId];
      onAnswerChange(question.id, newAnswers);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-900/60 mb-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            {index + 1}
          </span>
          <h3 className="text-sm font-semibold text-slate-200">
            Question {index + 1}
          </h3>
        </div>

        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
            isSingle
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}
        >
          {isSingle ? 'Choix unique' : 'Choix multiples'}
        </span>
      </div>

      <div className="mb-6 text-slate-200 text-sm sm:text-base">
        <MarkdownRenderer content={question.prompt} />
      </div>

      {!isSingle && (
        <p className="text-xs text-indigo-300/80 mb-4 flex items-center gap-1.5 font-medium">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Sélectionnez toutes les bonnes réponses (comparaison stricte).</span>
        </p>
      )}

      <div className="space-y-3">
        {question.choices.map((choice) => {
          const isSelected = selectedAnswers.includes(choice.id);

          return (
            <button
              type="button"
              key={choice.id}
              onClick={() => handleSelectChoice(choice.id)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10 text-white'
                  : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700 text-slate-300'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="mt-0.5 shrink-0">
                {isSingle ? (
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-slate-600 bg-slate-800/80'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500 text-white'
                        : 'border-slate-600 bg-slate-800/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                )}
              </div>

              <div className="flex-1 text-sm font-medium leading-relaxed">
                {choice.text}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
