'use client';

import React from 'react';
import Link from 'next/link';
import { Terminal, BookOpen, Clock, Award, ArrowRight } from 'lucide-react';
import type { GlobalProgress } from '../../lib/api/progress-api';
import { formatDuration } from '../../lib/utils/formatters';

interface DashboardHeaderProps {
  displayName?: string;
  overview: GlobalProgress;
}

export function DashboardHeader({ displayName, overview }: DashboardHeaderProps) {
  const totalSeconds = overview.totalTimeSpentSeconds || 0;
  const totalMinutes = Math.round(totalSeconds / 60);

  let timeDisplay: string;
  if (totalSeconds <= 0) {
    timeDisplay = "Temps d'apprentissage : --";
  } else if (totalMinutes === 0) {
    timeDisplay = "< 1 min d'apprentissage";
  } else {
    timeDisplay = `${formatDuration(totalMinutes)} d'apprentissage`;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-lg shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50 mb-8 backdrop-blur-xl transition-all">
      {/* Background glowing ambient lights */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-indigo-500/0 dark:from-sky-400/15 dark:via-blue-500/10 dark:to-indigo-500/0 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-8 w-64 h-32 bg-sky-500/10 dark:bg-sky-400/5 blur-2xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 dark:border-sky-400/30 dark:bg-sky-950/60 px-3.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 shadow-sm backdrop-blur-sm">
            <Terminal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>BTS SIO SISR — Espace d'Apprentissage Pratique</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bonjour,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 dark:from-sky-300 dark:via-cyan-300 dark:to-blue-400 drop-shadow-sm">
              {displayName || 'Étudiant'}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Suivez votre avancée dans le programme, reprenez vos leçons là où vous vous êtes arrêté et testez vos compétences.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">{overview.completedLessons}/{overview.totalLessons}</strong> leçons terminées
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm">
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">{overview.quizzesPassed}/{overview.totalQuizzes}</strong> quiz réussis
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{timeDisplay}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 dark:from-sky-500 dark:to-blue-600 dark:hover:from-sky-400 dark:hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/25 dark:shadow-sky-950/50 hover:shadow-sky-500/35 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>Explorer le Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
