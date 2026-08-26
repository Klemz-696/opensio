'use client';

import React, { useState } from 'react';
import { AlertTriangle, Database, FileText, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/use-auth';
import { deleteAccountApi } from '../../lib/api/profile';

export function ProfileRgpd() {
  const { user, accessToken, logout } = useAuth();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput === 'SUPPRIMER';

  const handleDeleteAccount = async () => {
    if (!isConfirmed || !accessToken) return;

    setIsDeleting(true);
    setError(null);

    const res = await deleteAccountApi(accessToken);
    setIsDeleting(false);

    if (res.success) {
      await logout();
      router.push('/login');
    } else {
      setError(res.error?.detail || 'Échec de la suppression du compte.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé des données personnelles */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Protection des données (RGPD)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vos droits d'accès, de rectification et d'effacement de vos données personnelles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Données enregistrées sur votre compte
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>Identité : Nom d'affichage, adresse email, biographie</li>
              <li>Médias : Fichier photo de profil (avatar)</li>
              <li>Pédagogie : Progression des leçons, scores et tentatives aux quiz</li>
              <li>Ateliers pratiques : Sessions de labs, commandes et validations</li>
              <li>Mentor IA : Conversations et préférences pédagogiques</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Hébergement & Confidentialité
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              OpenSIO est une plateforme auto-hébergée. Vos données sont conservées sur le serveur local de l'établissement / homelab sans revente ni transmission à des tiers.
            </p>
          </div>
        </div>
      </div>

      {/* Zone Danger / Suppression de compte */}
      <div className="rounded-2xl border border-rose-900/40 bg-rose-950/10 p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-300">
              Zone de danger : Suppression définitive du compte
            </h3>
            <p className="text-xs text-rose-400/80 mt-1">
              Cette action est irréversible. L'intégralité de vos données personnelles, votre photo de profil, votre progression et vos sessions d'entraînement seront définitivement effacées du système.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                setError(null);
                setConfirmInput('');
              }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer mon compte définitivement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modale de confirmation de suppression */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Confirmer la suppression
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous absolument certain de vouloir supprimer le compte{' '}
              <strong className="text-white">{user?.email}</strong> ?
              Votre photo de profil et l'intégralité de vos progressions seront détruites.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">
                Pour confirmer, veuillez saisir <strong className="text-rose-400">SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono tracking-widest uppercase"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!isConfirmed || isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-rose-600/30"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
