import React from 'react';
import { Award, BookCheck, Clock, Layers } from 'lucide-react';
import type { GlobalProgress } from '../../lib/api/progress-api';
import { formatDuration } from '../../lib/utils/formatters';

interface DashboardStatsProps {
  overview: GlobalProgress;
}

export function DashboardStats({ overview }: DashboardStatsProps) {
  const durationText = formatDuration(Math.round(overview.totalTimeSpentSeconds / 60));

  const stats = [
    {
      label: 'Progression globale',
      value: `${overview.progressPercentage}%`,
      subtext: `${overview.completedLessons}/${overview.totalLessons} leçons terminées`,
      icon: BookCheck,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      progress: overview.progressPercentage,
    },
    {
      label: 'Temps d\'apprentissage',
      value: durationText,
      subtext: 'Cumul des leçons actives',
      icon: Clock,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Quiz validés (RM-01)',
      value: `${overview.quizzesPassed}/${overview.totalQuizzes}`,
      subtext: overview.totalQuizzes > 0
        ? `${Math.round((overview.quizzesPassed / overview.totalQuizzes) * 100)}% de réussite`
        : 'Aucun quiz',
      icon: Award,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Modules validés (RM-03)',
      value: `${overview.completedModules}/${overview.totalModules}`,
      subtext: overview.totalModules > 0
        ? `${Math.round((overview.completedModules / overview.totalModules) * 100)}% validés`
        : 'Aucun module',
      icon: Layers,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  {stat.label}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${stat.iconBg}`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>

            {stat.progress !== undefined ? (
              <div className="space-y-1 mt-2">
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{stat.subtext}</div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{stat.subtext}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
