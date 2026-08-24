import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import type { LessonSummary } from '../../lib/api/catalog-api';
import { formatDifficulty, formatDuration } from '../../lib/utils/formatters';

interface ModuleLessonsListProps {
  moduleSlug: string;
  lessons: LessonSummary[];
}

export function ModuleLessonsList({ moduleSlug, lessons }: ModuleLessonsListProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">
            Leçons du module ({lessons.length})
          </h2>
        </div>
        <span className="text-xs text-slate-400">Ordre recommandé</span>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Aucune leçon dans ce module.</p>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const diff = formatDifficulty(lesson.difficulty);
            const lessonIndex = String(index + 1).padStart(2, '0');

            return (
              <Link
                key={lesson.id}
                href={`/catalogue/${moduleSlug}/${lesson.slug}`}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 font-mono font-bold text-xs flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {lessonIndex}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
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

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-sky-400 transition-colors">
                  <span className="text-xs hidden sm:inline font-medium">Lire la leçon</span>
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
