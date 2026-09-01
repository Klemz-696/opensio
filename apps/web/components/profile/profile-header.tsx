'use client';

import React from 'react';
import { Calendar, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { formatRole, getInitials } from '../../lib/utils/formatters';

interface ProfileHeaderProps {
  memberSince?: string;
  lastLogin?: string | null;
  bio?: string | null;
}

export function ProfileHeader({ memberSince, lastLogin, bio }: ProfileHeaderProps) {
  const { user } = useAuth();

  const formattedDate = memberSince
    ? new Date(memberSince).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/80 p-6 md:p-8 backdrop-blur-md shadow-md dark:shadow-xl">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-sky-500/40 bg-slate-100 dark:bg-slate-800 shadow-md dark:shadow-xl shadow-sky-500/10 flex items-center justify-center flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center">
                {getInitials(user?.displayName)}
              </div>
            )}
          </div>
        </div>

        {/* Détails */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {user?.displayName}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 self-center sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              {formatRole(user?.role)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{user?.email}</span>
            </div>

            {formattedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Membre depuis le {formattedDate}</span>
              </div>
            )}

            {lastLogin && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>
                  Dernier accès :{' '}
                  {new Date(lastLogin).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {bio && (
            <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 max-w-2xl">
              « {bio} »
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
