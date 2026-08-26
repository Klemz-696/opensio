import React from 'react';
import Link from 'next/link';
import { Clock, Layers, ArrowLeft } from 'lucide-react';
import type { LessonDetail } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface LessonHeaderProps {
  lesson: LessonDetail;
}

export function LessonHeader({ lesson }: LessonHeaderProps) {
  const diff = formatDifficulty(lesson.difficulty);

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200 dark:border-slate-700/60 bg-white/90 dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-950/90 shadow-sm dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Link
          href={`/catalogue/${lesson.module.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au module {lesson.module.title}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full border ${diff.color}`}>
            Difficulté {lesson.difficulty}/5 — {diff.label}
          </span>

          <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            {formatDuration(lesson.estimatedMinutes)}
          </span>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
        {lesson.title}
      </h1>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
        <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span>Module : {lesson.module.title}</span>
      </div>
    </div>
  );
}
