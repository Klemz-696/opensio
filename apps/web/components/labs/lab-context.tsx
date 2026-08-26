import React from 'react';
import { BookOpen, Layers, Award } from 'lucide-react';
import type { LabPublicDetail } from '../../lib/api/labs-api';
import { MarkdownRenderer } from '../lessons/markdown-renderer';
import { LabStepChecklist } from './lab-step-checklist';

interface LabContextProps {
  lab: LabPublicDetail;
  sessionId?: string | null;
}

export function LabContext({ lab, sessionId }: LabContextProps) {
  return (
    <div className="space-y-8 mb-8">
      {/* Checklist interactive des étapes */}
      <LabStepChecklist lab={lab} sessionId={sessionId} />

      {/* Détails du scénario & contrôles */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scénario & Contexte */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white">Contexte & Scénario</h2>
              </div>
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 leading-relaxed font-normal">
                <MarkdownRenderer content={lab.context} />
              </div>
            </div>
          </div>

          {/* Colonne latérale : Critères de validation & Prérequis */}
          <div className="space-y-6">
            {/* Critères de validation attendus */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">Contrôles du validateur</h2>
              </div>
              <div className="space-y-2">
                {lab.checksSummary.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200">
                        {chk.description || chk.id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {chk.required ? (
                          <span className="text-rose-400 font-medium">Obligatoire</span>
                        ) : (
                          <span className="text-sky-400 font-medium">Optionnel (bonus)</span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-800 font-bold text-amber-300 shrink-0 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" />
                      +{chk.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prérequis */}
            {lab.prerequisites && lab.prerequisites.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Leçons prérequises conseillées
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lab.prerequisites.map((pre, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700 font-mono"
                    >
                      {pre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
