'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import type { ProblemDetails } from '../../lib/auth/auth-types';

const loginSchema = z.object({
  email: z.string().min(1, 'L\'adresse email est requise').email('Format d\'email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/catalogue';

  const { login } = useAuth();
  const [globalError, setGlobalError] = useState<ProblemDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setGlobalError(null);

    const result = await login(data.email, data.password);

    if (result.success) {
      router.push(redirectUrl);
    } else {
      setGlobalError(result.error || {
        type: 'AUTH_FAILED',
        title: 'Échec de connexion',
        status: 401,
        detail: 'Identifiants incorrects ou compte inactif.',
      });
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setValue('email', 'student@opensio.local');
    setValue('password', 'StudentOpenSIO2026!');
    setGlobalError(null);
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-4 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Connexion à OpenSIO</h1>
        <p className="text-sm text-slate-400 mt-2">
          Plateforme pratique de révision BTS SIO SISR
        </p>
      </div>

      {globalError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">{globalError.title}</p>
            <p className="text-xs text-rose-300/90 mt-1">{globalError.detail}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Adresse Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              {...register('email')}
              type="email"
              placeholder="etudiant@opensio.local"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.email && (
            <p className="text-rose-400 text-xs mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          {errors.password && (
            <p className="text-rose-400 text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connexion en cours...</span>
            </>
          ) : (
            <>
              <span>Se connecter</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center">
        <button
          type="button"
          onClick={fillDemoAccount}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-4 cursor-pointer"
        >
          Remplir avec le compte étudiant démo (du seed)
        </button>
      </div>
    </div>
  );
}
