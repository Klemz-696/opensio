'use client';

import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { adminApi, type AdminUserItem } from '../../lib/api/admin-api';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  user: AdminUserItem | null;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string | null;
}

export function ResetPasswordDialog({
  isOpen,
  user,
  onClose,
  onSuccess,
  accessToken,
}: ResetPasswordDialogProps) {
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newPasswordResult, setNewPasswordResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setTemporaryPassword('');
    setErrorMsg(null);
    setNewPasswordResult(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = temporaryPassword.trim() ? { temporaryPassword: temporaryPassword.trim() } : undefined;
    const res = await adminApi.resetPassword(accessToken, user.id, payload);

    if (res.error) {
      setErrorMsg(res.error.detail || 'Erreur lors de la réinitialisation du mot de passe.');
      setIsSubmitting(false);
    } else if (res.data) {
      setNewPasswordResult(res.data.temporaryPassword);
      setIsSubmitting(false);
      onSuccess();
    }
  };

  const copyPassword = () => {
    if (newPasswordResult) {
      navigator.clipboard.writeText(newPasswordResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {newPasswordResult ? 'Mot de passe réinitialisé' : 'Réinitialiser le mot de passe'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Utilisateur : <strong className="text-slate-800 dark:text-slate-200">{user.displayName}</strong> ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {newPasswordResult ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Nouveau mot de passe généré !</p>
                <p className="mt-1 text-emerald-800/90 dark:text-emerald-300/90">
                  Toutes les sessions actives de l'utilisateur ont été révoquées. Il devra changer ce mot de passe dès sa prochaine connexion.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span>Mot de passe temporaire :</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newPasswordResult}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-amber-700 dark:text-amber-300 font-mono text-sm select-all focus:outline-none"
                />
                <button
                  onClick={copyPassword}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Terminer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>Impact de la réinitialisation :</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>Les sessions actives de l'utilisateur seront immédiatement fermées.</li>
                <li>Un mot de passe temporaire sera attribué au compte.</li>
                <li>L'utilisateur sera forcé de définir un nouveau mot de passe à sa connexion.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mot de passe temporaire personnalisé (Optionnel)
              </label>
              <input
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Laisser vide pour générer un mot de passe aléatoire"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Réinitialisation...</span>
                  </>
                ) : (
                  <span>Confirmer la réinitialisation</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
