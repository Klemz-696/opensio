'use client';

import React, { useState } from 'react';
import { Check, FileText, Loader2, Save, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { updateProfileApi } from '../../lib/api/profile';

interface ProfileEditorProps {
  initialBio?: string | null;
}

export function ProfileEditor({ initialBio }: ProfileEditorProps) {
  const { user, accessToken, updateCurrentUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(initialBio || user?.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setError(null);
    setSuccess(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Le nom d\'affichage doit comporter au moins 2 caractères.');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Le nom d\'affichage ne peut pas dépasser 50 caractères.');
      return;
    }

    if (bio.length > 500) {
      setError('La biographie ne peut pas dépasser 500 caractères.');
      return;
    }

    setIsSubmitting(true);
    const res = await updateProfileApi(accessToken, {
      displayName: trimmedName,
      bio: bio.trim().length > 0 ? bio.trim() : null,
    });
    setIsSubmitting(false);

    if (res.success && res.data) {
      updateCurrentUser({
        displayName: res.data.displayName,
        bio: res.data.bio,
      });
      setSuccess('Profil mis à jour avec succès.');
    } else {
      setError(res.error?.detail || 'Échec de la mise à jour du profil.');
    }
  };

  const bioCharCount = bio.length;
  const isBioLimitExceeded = bioCharCount > 500;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 backdrop-blur-sm space-y-5 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            Informations personnelles
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Modifiez votre nom public et votre présentation.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Email (Readonly) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Adresse email (non modifiable)
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed"
          />
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            Nom d'affichage <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            placeholder="Ex : Alexandre Dupont"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            Ce nom est visible sur vos contributions et dans la barre de navigation.
          </span>
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Biographie (optionnelle)
            </label>
            <span
              className={`text-[10px] font-mono ${
                isBioLimitExceeded ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {bioCharCount} / 500
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Présentez votre parcours, vos objectifs en BTS SIO SISR ou vos spécialités techniques..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isBioLimitExceeded}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Enregistrer les modifications</span>
        </button>
      </div>
    </form>
  );
}
