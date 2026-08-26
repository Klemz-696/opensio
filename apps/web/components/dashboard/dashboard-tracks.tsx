import React from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, Layers } from 'lucide-react';
import type { TrackProgress } from '../../lib/api/progress-api';

interface DashboardTracksProps {
  tracks: TrackProgress[];
}

export function DashboardTracks({ tracks }: DashboardTracksProps) {
  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-sm mb-8">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Progression par Année</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Cursus BTS SIO SISR</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map((track) => (
          <div
            key={track.trackId}
            className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{track.title}</h3>
                <span className="text-sm font-extrabold text-sky-600 dark:text-sky-400">
                  {track.progressPercentage}%
                </span>
              </div>

              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${track.progressPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  {track.completedModulesCount}/{track.modulesCount} module{track.modulesCount > 1 ? 's' : ''} validé{track.completedModulesCount > 1 ? 's' : ''}
                </span>
                <span>
                  {track.completedLessons}/{track.totalLessons} leçon{track.totalLessons > 1 ? 's' : ''} terminée{track.completedLessons > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <span>Accéder aux modules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
