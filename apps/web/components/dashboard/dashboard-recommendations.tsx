import React from 'react';
import Link from 'next/link';
import { Sparkles, RotateCcw, Award, BookOpen, ArrowRight } from 'lucide-react';
import type { DashboardRecommendation } from '../../lib/api/progress-api';

interface DashboardRecommendationsProps {
  recommendations: DashboardRecommendation[];
}

export function DashboardRecommendations({
  recommendations,
}: DashboardRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getIcon = (kind: string) => {
    switch (kind) {
      case 'retry_quiz':
        return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'take_quiz':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'continue_module':
        return <BookOpen className="w-4 h-4 text-sky-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 mb-8 bg-white/90 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recommandations pédagogiques</h2>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0">
                {getIcon(rec.kind)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            </div>

            <Link
              href={rec.href}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              <span>Accéder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
