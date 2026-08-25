import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Award,
  BookOpen,
  Sparkles,
  Bot,
} from 'lucide-react';
import type { QuizAttemptResult, QuizQuestionCorrection } from '../../lib/api/quiz-api';
import { MarkdownRenderer } from '../lessons/markdown-renderer';

interface QuizResultViewProps {
  result: QuizAttemptResult;
  moduleSlug: string;
  onRetry: () => void;
}

export function QuizResultView({
  result,
  moduleSlug,
  onRetry,
}: QuizResultViewProps) {
  const isPassed = result.passed;

  const handleAskMentor = (question: QuizQuestionCorrection, index: number) => {
    const userAnswersStr =
      question.userAnswers && question.userAnswers.length > 0
        ? question.userAnswers.join(', ')
        : 'Aucune réponse';

    const prompt = `J'ai fait une erreur à la question ${index + 1} du quiz « ${result.quizSlug} ».\nÉnoncé : « ${question.prompt} »\nMa réponse était : « ${userAnswersStr} ».\nPeux-tu m'expliquer pourquoi cette réponse est incorrecte et me guider pour mieux comprendre la notion ?`;

    const event = new CustomEvent('opensio:open-mentor', {
      detail: {
        initialMessage: prompt,
        title: `Coaching : ${result.quizSlug} (Q${index + 1})`,
        context: {
          pageType: 'quiz-coaching',
          pageSlug: result.quizSlug,
          quizSlug: result.quizSlug,
          moduleSlug,
          questionPrompt: question.prompt,
          userAnswer: userAnswersStr,
          isEvaluated: false,
        },
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Bannière de résultat principal */}
      <div
        className={`glass-panel rounded-3xl p-8 sm:p-10 border shadow-2xl relative overflow-hidden ${
          isPassed
            ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900/90 to-slate-950 border-emerald-500/30'
            : 'bg-gradient-to-b from-rose-950/40 via-slate-900/90 to-slate-950 border-rose-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border shadow-xl shrink-0 ${
                isPassed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              ) : (
                <XCircle className="w-10 h-10 sm:w-12 sm:h-12" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    isPassed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isPassed ? 'Félicitations — Quiz Validé !' : 'Score insuffisant — À retravailler'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isPassed ? 'Acquis confirmés 🎉' : 'Tentative non validée'}
              </h1>

              <p className="text-sm text-slate-300 mt-1 max-w-md">
                {isPassed
                  ? `Vous avez atteint le seuil requis de ${result.passingScore}% (RM-01). Ce quiz est validé pour votre progression.`
                  : `Le score obtenu est inférieur au seuil requis de ${result.passingScore}% (RM-01). Vous pouvez retenter immédiatement.`}
              </p>
            </div>
          </div>

          {/* Jauge / Cartouche de Score */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[200px] shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Score Obtenu
            </span>
            <div
              className={`text-4xl sm:text-5xl font-black tracking-tight ${
                isPassed ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {result.score}%
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {result.correctQuestions} / {result.totalQuestions} bonne{result.correctQuestions > 1 ? 's' : ''} réponse{result.correctQuestions > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/catalogue/${encodeURIComponent(moduleSlug)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au module</span>
          </Link>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recommencer le quiz</span>
          </button>
        </div>
      </div>

      {/* Détail des corrections question par question */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Correction détaillée et explications pédagogiques</span>
          </h2>
          <span className="text-xs text-slate-400">
            {result.questions.length} question{result.questions.length > 1 ? 's' : ''}
          </span>
        </div>

        {result.questions.map((question, index) => (
          <div
            key={question.questionId}
            className={`glass-panel rounded-2xl p-6 sm:p-8 border shadow-lg transition-all ${
              question.isCorrect
                ? 'bg-slate-900/60 border-emerald-500/30'
                : 'bg-slate-900/60 border-rose-500/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border ${
                    question.isCorrect
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Question {index + 1}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                    question.isCorrect
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {question.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Correct (+1)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Incorrect (0)</span>
                    </>
                  )}
                </span>

                {!question.isCorrect && (
                  <button
                    type="button"
                    onClick={() => handleAskMentor(question, index)}
                    aria-label={`Demander une explication au mentor pour la question ${index + 1}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-all cursor-pointer shadow-sm"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Expliquer avec le mentor</span>
                  </button>
                )}
              </div>
            </div>

            {/* Énoncé de la question */}
            <div className="mb-6 text-slate-200 text-sm sm:text-base">
              <MarkdownRenderer content={question.prompt} />
            </div>

            {/* Explication pédagogique statique existante */}
            {question.explanation && (
              <div className="mt-4 p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Explication pédagogique :</span>
                </div>
                <MarkdownRenderer content={question.explanation} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
