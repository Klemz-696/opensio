'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  KeyRound,
} from 'lucide-react';
import { adminApi, type CreateUserResponse } from '../../lib/api/admin-api';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string | null;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  onSuccess,
  accessToken,
}: CreateUserDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('APPRENANT');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setDisplayName('');
    setEmail('');
    setRole('APPRENANT');
    setTemporaryPassword('');
    setErrorMsg(null);
    setCreatedResult(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      role,
      ...(temporaryPassword.trim() ? { temporaryPassword: temporaryPassword.trim() } : {}),
    };

    const res = await adminApi.createUser(accessToken, payload);

    if (res.error) {
      setErrorMsg(res.error.detail || 'Erreur lors de la création de l\'utilisateur.');
      setIsSubmitting(false);
    } else if (res.data) {
      setCreatedResult(res.data);
      setIsSubmitting(false);
      onSuccess();
    }
  };

  const copyPassword = () => {
    if (createdResult?.temporaryPassword) {
      navigator.clipboard.writeText(createdResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {createdResult ? 'Compte Utilisateur Créé' : 'Créer un nouvel utilisateur'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {createdResult
                  ? 'Transmettez les identifiants temporaires à l\'utilisateur.'
                  : 'Renseignez les informations de base du nouveau compte.'}
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

        {createdResult ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Compte créé avec succès !</p>
                <p className="mt-1 text-emerald-800/90 dark:text-emerald-300/90">
                  L'utilisateur sera invité à changer son mot de passe dès sa première connexion.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Email : <strong className="text-slate-900 dark:text-white">{createdResult.user.email}</strong>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Nom complet : <strong className="text-slate-900 dark:text-white">{createdResult.user.displayName}</strong>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Rôle : <strong className="text-slate-900 dark:text-white">{createdResult.user.role}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Mot de passe temporaire :</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdResult.temporaryPassword}
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
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Terminer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nom complet / Affichage *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex : Alice Dupont"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice.dupont@opensio.local"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Rôle *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="APPRENANT">Apprenant (Accès cours, quiz, labs)</option>
                <option value="ADMIN">Administrateur (Gestion complète et utilisateurs)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mot de passe temporaire (Optionnel)
              </label>
              <input
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Laisser vide pour générer automatiquement"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Si non renseigné, un mot de passe fort sera généré automatiquement.
              </p>
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <span>Créer le compte</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
