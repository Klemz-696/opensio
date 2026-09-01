'use client';

/**
 * ScenarioPlayer — Lecteur guidé pour les labs de niveau 1_theory (scénarios de panne)
 * Affiche les étapes QCM séquentielles, les indices progressifs et soumet answers.json.
 * D-13 : < 400 lignes
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, Bot, ChevronRight, ChevronLeft } from 'lucide-react';

export interface ScenarioStep {
  id: string;
  question: string;
  choices: Array<{ id: string; text: string }>;
}

export interface ScenarioPlayerProps {
  /** Étapes QCM définies statiquement par scénario */
  steps: ScenarioStep[];
  isSessionActive: boolean;
  isValidating: boolean;
  onValidate: (answers: Array<{ id: string; answer: string }>) => Promise<void>;
  onAskAI?: (context: string) => void;
}

export function ScenarioPlayer({
  steps,
  isSessionActive,
  isValidating,
  onValidate,
  onAskAI,
}: ScenarioPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const selectedAnswer = step ? answers[step.id] : undefined;
  const allAnswered = steps.every((s) => answers[s.id] !== undefined);

  function handleSelect(choiceId: string) {
    if (!isSessionActive || submitted) return;
    setAnswers((prev) => ({ ...prev, [step.id]: choiceId }));
  }

  function handleNext() {
    if (currentStep < totalSteps - 1) setCurrentStep((n) => n + 1);
  }

  function handlePrev() {
    if (currentStep > 0) setCurrentStep((n) => n - 1);
  }

  async function handleSubmit() {
    if (!allAnswered || isValidating || submitted) return;
    setSubmitted(true);
    const answersArray = steps.map((s) => ({ id: s.id, answer: answers[s.id] ?? '' }));
    await onValidate(answersArray);
    setSubmitted(false);
  }

  function handleAskAI() {
    if (!onAskAI || !step) return;
    const context = `Je résous le scénario de panne. Étape ${currentStep + 1}/${totalSteps} : "${step.question}". Peux-tu m'aider à comprendre sans me donner directement la réponse ?`;
    onAskAI(context);
  }

  if (!step) return null;

  return (
    <div className="space-y-6">
      {/* Barre de progression des étapes */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentStep(i)}
            title={`Étape ${i + 1}`}
            className={[
              'h-2 flex-1 rounded-full transition-colors cursor-pointer',
              i === currentStep
                ? 'bg-blue-500'
                : answers[s.id] !== undefined
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Étape courante */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Étape {currentStep + 1} / {totalSteps}
            </p>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              {step.question}
            </p>
          </div>
          {onAskAI && (
            <button
              type="button"
              onClick={handleAskAI}
              title="Demander à l'IA"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-400/50 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>IA</span>
            </button>
          )}
        </div>

        {/* Choix */}
        <div className="space-y-2.5">
          {step.choices.map((choice) => {
            const isSelected = selectedAnswer === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={!isSessionActive || submitted}
                onClick={() => handleSelect(choice.id)}
                className={[
                  'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all cursor-pointer',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-slate-700 dark:text-slate-300',
                  !isSessionActive ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-2.5">
                  <span
                    className={[
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500',
                    ].join(' ')}
                  >
                    {choice.id.toUpperCase()}
                  </span>
                  {choice.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation entre étapes */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!selectedAnswer}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!allAnswered || isValidating || !isSessionActive}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {isValidating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validation…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Valider ma résolution
              </>
            )}
          </button>
        )}
      </div>

      {/* Résumé des réponses */}
      {Object.keys(answers).length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Récapitulatif de vos réponses
          </p>
          <div className="flex flex-wrap gap-2">
            {steps.map((s, i) => {
              const ans = answers[s.id];
              return (
                <span
                  key={s.id}
                  className={[
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold',
                    ans !== undefined
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                  ].join(' ')}
                >
                  {ans !== undefined ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Lightbulb className="w-3 h-3" />
                  )}
                  Étape {i + 1} {ans ? `→ ${ans.toUpperCase()}` : '(sans réponse)'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
