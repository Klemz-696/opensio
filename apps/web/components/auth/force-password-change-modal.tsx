'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';

export function ForcePasswordChangeModal() {
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  // Critères de sécurité
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await changePassword(currentPassword, newPassword);

    if (!result.success) {
      setErrorMsg(
        result.error?.detail ||
          'Impossible de mettre à jour le mot de passe. Vérifiez votre mot de passe temporaire actuel.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Changement de mot de passe obligatoire
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Votre compte a été initialisé avec un mot de passe temporaire. Définissez votre nouveau mot de passe personnel pour continuer.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mot de passe temporaire actuel
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Entrez le mot de passe temporaire"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nouveau mot de passe personnel
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe fort"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Checklist des exigences */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
            <p className="font-semibold text-slate-700 dark:text-slate-400 mb-1">Exigences de sécurité :</p>
            <div className="grid grid-cols-2 gap-1.5 text-slate-600 dark:text-slate-400">
              <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {hasMinLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                8 caractères min.
              </span>
              <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {hasUpper ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                1 majuscule
              </span>
              <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {hasLower ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                1 minuscule
              </span>
              <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {hasNumber ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                1 chiffre
              </span>
              <span className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {hasSpecial ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                1 caractère spécial
              </span>
              <span className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {passwordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                Mots de passe identiques
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Valider le mot de passe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
