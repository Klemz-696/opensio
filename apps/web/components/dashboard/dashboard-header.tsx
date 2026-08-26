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
  const timeFormatted = formatDuration(Math.round(overview.totalTimeSpentSeconds / 60));

  return (
    <div className="relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950 shadow-md dark:shadow-2xl mb-8">
      {/* Background glowing ambient light */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>BTS SIO SISR — Espace d'Apprentissage Pratique</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bonjour,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600 dark:from-sky-400 dark:to-blue-500">
              {displayName || 'Étudiant'}
            </span>
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Suivez votre avancée dans le programme, reprenez vos leçons là où vous vous êtes arrêté et testez vos compétences.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{overview.completedLessons}/{overview.totalLessons} leçons terminées</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{overview.quizzesPassed}/{overview.totalQuizzes} quiz réussis</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{timeFormatted} d'apprentissage</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
          >
            <span>Explorer le Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
