'use client';

import React, { useState } from 'react';
import {
  X,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { adminApi, type AdminUserItem } from '../../lib/api/admin-api';

interface ToggleStatusDialogProps {
  isOpen: boolean;
  user: AdminUserItem | null;
  currentAdminId?: string;
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string | null;
}

export function ToggleStatusDialog({
  isOpen,
  user,
  currentAdminId,
  onClose,
  onSuccess,
  accessToken,
}: ToggleStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = Boolean(currentAdminId && user.id === currentAdminId);
  const isCurrentlyActive = user.status === 'ACTIVE';
  const newStatus = isCurrentlyActive ? 'DISABLED' : 'ACTIVE';

  const handleConfirm = async () => {
    if (isSelf && isCurrentlyActive) {
      setErrorMsg('Vous ne pouvez pas désactiver votre propre compte administrateur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await adminApi.updateUser(accessToken, user.id, { status: newStatus });

    if (res.error) {
      setErrorMsg(res.error.detail || 'Erreur lors du changement de statut.');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isCurrentlyActive
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isCurrentlyActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isCurrentlyActive ? 'Désactiver le compte' : 'Activer le compte'}
              </h2>
              <p className="text-xs text-slate-400">
                Utilisateur : <strong className="text-slate-200">{user.displayName}</strong>
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

        {isSelf && isCurrentlyActive && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Action interdite</p>
              <p className="mt-0.5 text-amber-300/90">
                Vous ne pouvez pas désactiver votre propre compte administrateur pour éviter tout verrouillage accidentel.
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

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          {isCurrentlyActive ? (
            <p>
              Êtes-vous sûr de vouloir désactiver le compte de <strong>{user.email}</strong> ?
              L'utilisateur ne pourra plus se connecter et toutes ses sessions actives seront révoquées.
            </p>
          ) : (
            <p>
              Êtes-vous sûr de vouloir réactiver le compte de <strong>{user.email}</strong> ?
              L'utilisateur pourra à nouveau se connecter avec ses identifiants.
            </p>
          )}
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
            type="button"
            disabled={isSubmitting || (isSelf && isCurrentlyActive)}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer ${
              isCurrentlyActive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Modification...</span>
              </>
            ) : isCurrentlyActive ? (
              <span>Désactiver le compte</span>
            ) : (
              <span>Activer le compte</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
