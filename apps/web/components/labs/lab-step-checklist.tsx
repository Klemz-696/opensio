'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  ListOrdered,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { LabPublicDetail } from '../../lib/api/labs-api';

interface LabStepChecklistProps {
  lab: LabPublicDetail;
  sessionId?: string | null;
}

export function LabStepChecklist({ lab, sessionId }: LabStepChecklistProps) {
  // Liste des étapes combinant les objectifs et les points de contrôle
  const steps = React.useMemo(() => {
    const items: Array<{ id: string; title: string; hint?: string; required?: boolean }> = [];

    lab.objectives.forEach((obj, idx) => {
      items.push({
        id: `obj-${idx}`,
        title: obj,
      });
    });

    lab.checksSummary.forEach((chk) => {
      // Éviter les doublons stricts de texte
      if (!items.some((i) => i.title.toLowerCase() === (chk.description || '').toLowerCase())) {
        items.push({
          id: `chk-${chk.id}`,
          title: chk.description || `Validation du critère : ${chk.id}`,
          hint: `${chk.points} pts — ${chk.required ? 'Obligatoire' : 'Bonus'}`,
          required: chk.required,
        });
      }
    });

    return items;
  }, [lab]);

  const storageKey = `opensio:lab-checklist:${lab.slug}${sessionId ? `:${sessionId}` : ''}`;

  const [checkedStepIds, setCheckedStepIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger la progression depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCheckedStepIds(parsed);
        }
      }
    } catch {
      // Ignorer les erreurs d'accès au stockage local
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Sauvegarder la progression dans localStorage
  const toggleStep = (id: string) => {
    const next = checkedStepIds.includes(id)
      ? checkedStepIds.filter((item) => item !== id)
      : [...checkedStepIds, id];

    setCheckedStepIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignorer
    }
  };

  const handleReset = () => {
    setCheckedStepIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignorer
    }
  };

  const totalCount = steps.length;
  const completedCount = checkedStepIds.filter((id) =>
    steps.some((s) => s.id === id),
  ).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 bg-slate-900/60 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Checklist de progression du Lab
            </h3>
            <p className="text-xs text-slate-400">
              Cochez les étapes au fur et à mesure de votre avancement pratique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-sky-400">
              {completedCount} / {totalCount} ({progressPercent}%)
            </div>
          </div>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Réinitialiser les étapes"
              title="Réinitialiser les étapes cochées"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression des étapes du lab"
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Liste des étapes */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isChecked = isLoaded && checkedStepIds.includes(step.id);

          return (
            <button
              type="button"
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                isChecked
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
              </div>

              <div className="flex-1 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-400 text-xs">
                    Étape {idx + 1} :
                  </span>
                  <span className={isChecked ? 'line-through text-slate-400' : 'text-slate-200'}>
                    {step.title}
                  </span>
                </div>
                {step.hint && (
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {step.hint}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {progressPercent === 100 && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Toutes les étapes ont été cochées. Pensez à lancer l’évaluation pour valider votre note finale !</span>
        </div>
      )}
    </div>
  );
}
