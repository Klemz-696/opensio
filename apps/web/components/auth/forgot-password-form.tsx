'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, AlertCircle, Loader2, Send, CheckCircle2, KeyRound } from 'lucide-react';
import type { ProblemDetails } from '../../lib/auth/auth-types';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('Format d\'email invalide')
    .trim()
    .toLowerCase(),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [globalError, setGlobalError] = useState<ProblemDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const errorData: ProblemDetails = await response.json().catch(() => ({
          type: 'about:blank',
          title: 'Erreur',
          status: response.status,
          detail: 'Impossible de traiter la demande.',
        }));
        setGlobalError(errorData);
      }
    } catch (err: unknown) {
      setGlobalError({
        type: 'NETWORK_ERROR',
        title: 'Erreur réseau',
        status: 0,
        detail: err instanceof Error ? err.message : 'Impossible de contacter le serveur',
      });
    } finally {
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
          Demande envoyée
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Si cet email correspond à un compte actif, un lien de réinitialisation vous a été envoyé avec les instructions.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 py-3 px-4 w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition-all duration-200"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 mb-4 shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mot de passe oublié</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
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
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Adresse Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email"
              {...register('email')}
              type="email"
              placeholder="etudiant@opensio.local"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.email && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Envoi en cours...</span>
            </>
          ) : (
            <>
              <span>Envoyer le lien</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
        <Link
          href="/login"
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          Retour à la page de <span className="font-semibold underline underline-offset-4">Connexion</span>
        </Link>
      </div>
    </div>
  );
}
