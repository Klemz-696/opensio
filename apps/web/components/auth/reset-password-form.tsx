'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, AlertCircle, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import type { ProblemDetails } from '../../lib/auth/auth-types';
import { isPasswordPolicyValid } from './register-form';

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .refine(
      isPasswordPolicyValid,
      'Le mot de passe doit contenir au moins 3 catégories : minuscules, majuscules, chiffres, caractères spéciaux'
    ),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [globalError, setGlobalError] = useState<ProblemDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  if (!token) {
    return (
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 mb-6 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Lien invalide
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Le jeton de réinitialisation est manquant. Veuillez utiliser le lien fourni dans votre email.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 py-3 px-4 w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition-all duration-200"
        >
          Refaire une demande
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });

      if (response.ok) {
        setIsSuccess(true);
        // Rediriger après 3 secondes
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const errorData: ProblemDetails = await response.json().catch(() => ({
          type: 'about:blank',
          title: 'Erreur',
          status: response.status,
          detail: 'Impossible de réinitialiser le mot de passe (jeton expiré ou invalide).',
        }));
        setGlobalError(errorData);
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setGlobalError({
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Impossible de contacter le serveur',
      });
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-6 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Mot de passe modifié
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Votre mot de passe a été mis à jour avec succès. Redirection vers la page de connexion...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 mb-4 shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Nouveau mot de passe</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Définissez un mot de passe sécurisé pour votre compte.
        </p>
      </div>

      {globalError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-800 dark:text-rose-200">{globalError.title}</p>
            <p className="text-xs text-rose-600 dark:text-rose-300/90 mt-1">{globalError.detail}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="newPassword"
              {...register('newPassword')}
              type="password"
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.newPassword && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{errors.newPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Modification...</span>
            </>
          ) : (
            <>
              <span>Valider le mot de passe</span>
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
