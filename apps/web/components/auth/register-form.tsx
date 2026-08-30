'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import type { ProblemDetails } from '../../lib/auth/auth-types';

export function isPasswordPolicyValid(password: string): boolean {
  if (password.length < 12) return false;

  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;

  return classes >= 3;
}

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim(),
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('Format d\'email invalide')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .refine(
      isPasswordPolicyValid,
      'Le mot de passe doit contenir au moins 3 catégories : minuscules, majuscules, chiffres, caractères spéciaux'
    ),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/catalogue';

  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<ProblemDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Inscription réussie. L'API ne connecte pas automatiquement.
        // On effectue un appel login() avec les identifiants en clair pour récupérer le JWT.
        const loginResult = await login(data.email, data.password);
        if (loginResult.success) {
          router.push(redirectUrl);
        } else {
          // Si le login auto échoue bizarrement
          router.push('/login?message=registered');
        }
      } else {
        const errorData: ProblemDetails = await response.json().catch(() => ({
          type: 'about:blank',
          title: 'Erreur d\'inscription',
          status: response.status,
          detail: 'Impossible de créer le compte.',
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

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
          <User className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Créer un compte</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Rejoignez la plateforme OpenSIO
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
          <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Nom
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              id="displayName"
              {...register('displayName')}
              type="text"
              placeholder="Jean Dupont"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.displayName && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{errors.displayName.message}</p>
          )}
        </div>

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
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.email && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password"
              {...register('password')}
              type="password"
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.password && (
            <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Inscription en cours...</span>
            </>
          ) : (
            <>
              <span>S'inscrire</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
        <Link
          href="/login"
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
        >
          Déjà un compte ? <span className="font-semibold underline underline-offset-4">Se connecter</span>
        </Link>
      </div>
    </div>
  );
}
