import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import type { LessonDetail } from '../../lib/api/catalog-api';
import { formatLabLevel } from '../../lib/utils/formatters';

interface LessonMetadataProps {
  lesson: LessonDetail;
}

export function LessonMetadata({ lesson }: LessonMetadataProps) {
  const hasObjectives = lesson.objectives && lesson.objectives.length > 0;
  const hasPrerequisites = lesson.prerequisites && lesson.prerequisites.length > 0;
  const hasCriteria = lesson.successCriteria && lesson.successCriteria.length > 0;
  const hasLabs = lesson.relatedLabs && lesson.relatedLabs.length > 0;

  if (!hasObjectives && !hasPrerequisites && !hasCriteria && !hasLabs) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {hasObjectives && (
        <div className="glass-panel rounded-xl p-5 border border-sky-500/20 bg-sky-500/5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm mb-3">
            <Target className="w-4 h-4" />
            <span>Objectifs d'apprentissage</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {lesson.objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasCriteria && (
        <div className="glass-panel rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>Critères de réussite</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {lesson.successCriteria.map((crit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 mt-1.5" />
                <span>{crit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasPrerequisites && (
        <div className="glass-panel rounded-xl p-5 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Prérequis recommandés</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {lesson.prerequisites.map((prereq, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{prereq}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasLabs && (
        <div className="glass-panel rounded-xl p-5 border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm mb-3">
            <Terminal className="w-4 h-4" />
            <span>Labs d'application associés</span>
          </div>
          <div className="space-y-2">
            {lesson.relatedLabs.map((lab) => {
              const labInfo = formatLabLevel(lab.level);
              return (
                <div
                  key={lab.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">{lab.title}</span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                    {labInfo.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
