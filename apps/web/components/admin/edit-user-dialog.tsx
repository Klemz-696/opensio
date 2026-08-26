'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { adminApi, type AdminUserItem } from '../../lib/api/admin-api';

interface EditUserDialogProps {
  isOpen: boolean;
  user: AdminUserItem | null;
  currentAdminId?: string;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string | null;
}

export function EditUserDialog({
  isOpen,
  user,
  currentAdminId,
  onClose,
  onSuccess,
  accessToken,
}: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('APPRENANT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSelf = Boolean(user && currentAdminId && user.id === currentAdminId);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setRole(user.role.toUpperCase());
      setErrorMsg(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      role: isSelf ? 'ADMIN' : role,
    };

    const res = await adminApi.updateUser(accessToken, user.id, payload);

    if (res.error) {
      setErrorMsg(res.error.detail || 'Erreur lors de la mise à jour de l\'utilisateur.');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Modifier l'utilisateur</h2>
              <p className="text-xs text-slate-400">
                Mise à jour du profil et des permissions d'accès.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSelf && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Votre propre compte</p>
              <p className="mt-0.5 text-amber-300/90">
                Par mesure de sécurité, vous ne pouvez pas rétrograder votre propre rôle d'administrateur.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nom complet / Affichage *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Adresse email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Rôle *
            </label>
            <select
              value={role}
              disabled={isSelf}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="APPRENANT">Apprenant</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer les modifications</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
