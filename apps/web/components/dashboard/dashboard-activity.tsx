import React from 'react';
import { History, CheckCircle2, PlayCircle, Trophy, AlertCircle, Sparkles } from 'lucide-react';
import type { ActivityEvent } from '../../lib/api/progress-api';

interface DashboardActivityProps {
  events: ActivityEvent[];
}

export function DashboardActivity({ events }: DashboardActivityProps) {
  if (!events || events.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <History className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activité récente</h2>
        </div>
        <p className="text-xs text-slate-500 italic py-4">
          Aucun événement d'activité pour le moment.
        </p>
      </div>
    );
  }

  const renderEventDetails = (event: ActivityEvent) => {
    const meta = (event.metadata as Record<string, unknown>) || {};
    const date = new Date(event.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    switch (event.kind) {
      case 'LESSON_COMPLETED':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          title: `Leçon terminée : ${meta.lessonTitle || meta.lessonSlug || 'Leçon'}`,
          subtext: meta.moduleTitle ? String(meta.moduleTitle) : 'Module',
          date,
        };
      case 'LESSON_STARTED':
        return {
          icon: <PlayCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          title: `Leçon commencée : ${meta.lessonTitle || meta.lessonSlug || 'Leçon'}`,
          subtext: meta.moduleTitle ? String(meta.moduleTitle) : 'Module',
          date,
        };
      case 'QUIZ_PASSED':
        return {
          icon: <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          title: `Quiz validé : ${meta.quizTitle || meta.quizSlug || 'Quiz'}`,
          subtext: `Score obtenu : ${meta.score}%`,
          date,
        };
      case 'QUIZ_ATTEMPTED':
      case 'QUIZ_FAILED':
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
          title: `Tentative de quiz : ${meta.quizTitle || meta.quizSlug || 'Quiz'}`,
          subtext: `Score : ${meta.score}% (seuil : ${meta.passingScore}%)`,
          date,
        };
      case 'LAB_STARTED':
        return {
          icon: <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          title: `Atelier démarré : ${meta.labTitle || meta.labSlug || 'Atelier pratique'}`,
          subtext: 'Session pratique en cours',
          date,
        };
      case 'LAB_COMPLETED':
      case 'LAB_PASSED':
        return {
          icon: <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          title: `Atelier validé : ${meta.labTitle || meta.labSlug || 'Atelier pratique'}`,
          subtext: meta.score !== undefined ? `Score obtenu : ${meta.score} pts` : 'Validé avec succès',
          date,
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
          title: `Action : ${event.kind}`,
          subtext: `${event.entityType}`,
          date,
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activité récente</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Journal en direct</span>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const detail = renderEventDetails(event);

          return (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 mt-0.5 shrink-0">
                  {detail.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {detail.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{detail.subtext}</p>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                {detail.date}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
