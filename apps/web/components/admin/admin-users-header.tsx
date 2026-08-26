'use client';

import React from 'react';
import { Users, UserPlus, Shield, GraduationCap, CheckCircle2 } from 'lucide-react';
import type { AdminUserItem } from '../../lib/api/admin-api';

interface AdminUsersHeaderProps {
  users: AdminUserItem[];
  total: number;
  onOpenCreate: () => void;
}

export function AdminUsersHeader({ users, total, onOpenCreate }: AdminUsersHeaderProps) {
  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'admin').length;
  const learnerCount = users.filter((u) => u.role === 'APPRENANT' || u.role === 'apprenant').length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Administration Système</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Contrôle des accès, rôles et sécurité des comptes OpenSIO.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Créer un utilisateur</span>
        </button>
      </div>

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Comptes</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{total}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Apprenants</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{learnerCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Administrateurs</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{adminCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Actifs</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
