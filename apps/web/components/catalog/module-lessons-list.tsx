import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LessonSummary } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface ModuleLessonsListProps {
  moduleSlug: string;
  lessons: LessonSummary[];
}

export function ModuleLessonsList({ moduleSlug, lessons }: ModuleLessonsListProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Leçons du module ({lessons.length})
          </h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Ordre recommandé</span>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Aucune leçon dans ce module.</p>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const diff = formatDifficulty(lesson.difficulty);
            const lessonIndex = String(index + 1).padStart(2, '0');
            const isCompleted = lesson.status === 'completed';
            const isStarted = lesson.status === 'started';

            return (
              <Link
                key={lesson.id}
                href={`/catalogue/${moduleSlug}/${lesson.slug}`}
                className={`flex items-center justify-between p-4 rounded-xl transition-all group cursor-pointer border ${
                  isCompleted
                    ? 'bg-emerald-500/5 dark:bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10 dark:hover:bg-slate-800/60'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800/80 hover:border-sky-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg border font-mono font-bold text-xs flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : lessonIndex}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                        {lesson.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Terminée
                        </span>
                      )}
                      {!isCompleted && isStarted && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                          En cours
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${diff.color}`}>
                        {diff.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatDuration(lesson.estimatedMinutes)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  <span className="text-xs hidden sm:inline font-medium">
                    {isCompleted ? 'Revoir la leçon' : 'Lire la leçon'}
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
