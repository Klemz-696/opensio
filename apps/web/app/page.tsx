'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Lock, Terminal, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/auth/use-auth';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-3xl w-full text-center space-y-8 glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>BTS SIO SISR — Plateforme Pratique Auto-hébergée</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Apprendre le SISR par la <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">pratique</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Cours complets en Markdown sécurisé, quiz d'auto-évaluation et labs pratiques sur des scénarios réels d'infrastructure et de réseaux.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <BookOpen className="w-5 h-5 text-sky-400 mb-2" />
            <h3 className="font-bold text-white mb-1">Catalogue 1ère & 2ème Année</h3>
            <p className="text-slate-400">Structure modulaire alignée sur le référentiel officiel BTS SIO.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="font-bold text-white mb-1">Markdown Enrichi & Shiki</h3>
            <p className="text-slate-400">Exemples de commandes réels et coloration syntaxique professionnelle.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <Shield className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="font-bold text-white mb-1">Session Sécurisée D-09</h3>
            <p className="text-slate-400">Access token en mémoire vive uniquement & refresh token HttpOnly.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/catalogue"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
          >
            <span>Accéder au Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Se connecter</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
