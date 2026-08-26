'use client';

import React, { useState } from 'react';
import { Bot, Check, Loader2, Moon, Palette, Save, Sliders, Volume2 } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { updatePreferencesApi } from '../../lib/api/profile';

interface ProfilePreferencesProps {
  initialTheme?: 'dark' | 'light' | 'system';
  initialSoundEffects?: boolean;
  initialAiFreeMode?: boolean;
  initialAiModel?: string | null;
}

export function ProfilePreferences({
  initialTheme = 'dark',
  initialSoundEffects = true,
  initialAiFreeMode = false,
  initialAiModel = 'deepseek-r1:14b',
}: ProfilePreferencesProps) {
  const { accessToken } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(initialTheme);
  const [soundEffects, setSoundEffects] = useState<boolean>(initialSoundEffects);
  const [aiFreeMode, setAiFreeMode] = useState<boolean>(initialAiFreeMode);
  const [aiModel, setAiModel] = useState<string>(initialAiModel || 'deepseek-r1:14b');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await updatePreferencesApi(accessToken, {
      theme,
      soundEffects,
      aiFreeMode,
      aiPreferredModel: aiModel,
    });
    setIsSubmitting(false);

    if (res.success) {
      setSuccess('Préférences enregistrées avec succès.');
    } else {
      setError(res.error?.detail || 'Échec de l\'enregistrement des préférences.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            Préférences d'apprentissage & Interface
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Personnalisez votre expérience d'entraînement et l'accompagnement IA.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thème visuel */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Thème visuel
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'dark', label: 'Sombre (Défaut)', icon: Moon },
              { key: 'system', label: 'Système', icon: Sliders },
              { key: 'light', label: 'Clair', icon: Palette },
            ].map(({ key, label }) => {
              const isSelected = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key as 'dark' | 'light' | 'system')}
                  className={`p-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/15 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Effets sonores */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Retours audio & Quiz
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:bg-slate-800/40 transition-colors">
            <div className="text-xs">
              <span className="text-white font-medium block">Sons de validation</span>
              <span className="text-slate-400 text-[11px]">Jouer un effet lors de la réussite d'un quiz</span>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => setSoundEffects(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      {/* Mentor IA Section */}
      <div className="border-t border-slate-800 pt-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          Mentor Pédagogique IA
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Mode de guidage</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {aiFreeMode ? 'Mode Libre' : 'Mode Guidé'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              En mode guidé (recommandé pour le BTS), le tuteur vous donne des indices méthodologiques sans donner la solution directe.
            </p>
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiFreeMode}
                onChange={(e) => setAiFreeMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">Activer le mode libre (sans filtre pédagogique)</span>
            </label>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
            <span className="text-xs font-semibold text-white block">Modèle LLM de prédilection</span>
            <p className="text-[11px] text-slate-400">
              Sélectionnez le modèle local Ollama utilisé pour vos sessions d'assistance.
            </p>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="deepseek-r1:14b">DeepSeek R1 (14B) — Raisonnement expert</option>
              <option value="qwen2.5-coder:14b">Qwen 2.5 Coder (14B) — Scripting & Réseau</option>
              <option value="mistral:7b">Mistral (7B) — Léger & Rapide</option>
              <option value="llama3.1:8b">Llama 3.1 (8B) — Équilibré</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Enregistrer les préférences</span>
        </button>
      </div>
    </form>
  );
}
