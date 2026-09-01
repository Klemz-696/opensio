'use client';

import React from 'react';
import type { AiPreferences } from '../../lib/api/chat-api';

interface MentorChatSettingsProps {
  availableModels: string[];
  preferences: AiPreferences;
  currentModel?: string;
  onSelectModel: (model: string) => void;
  onToggleFreeMode: () => void;
}

export function MentorChatSettings({
  availableModels,
  preferences,
  currentModel,
  onSelectModel,
  onToggleFreeMode,
}: MentorChatSettingsProps) {
  const activeModel = preferences.preferredModel || currentModel;

  return (
    <div className="p-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      <div>
        <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">
          Modèle d&apos;intelligence artificielle :
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableModels.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onSelectModel(m)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                activeModel === m
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">Mode Libre (Explications directes)</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block max-w-xs">
            Lève la restriction socratique uniquement hors contexte évalué (jamais en lab/quiz noté).
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleFreeMode}
          className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
            preferences.freeMode ? 'bg-indigo-600 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
        </button>
      </div>
    </div>
  );
}
