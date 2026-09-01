'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, LayoutDashboard, LogOut, ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { getInitials, formatRole } from '../../lib/utils/formatters';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/75 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/catalogue" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                OpenSIO
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  SISR
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-slate-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Tableau de bord</span>
            </Link>
            <Link
              href="/catalogue"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Catalogue</span>
            </Link>
            {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'admin') && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-500/20 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span>Administration</span>
              </Link>
            )}
          </nav>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:hover:bg-slate-800/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-all cursor-pointer group"
              title="Mon profil et préférences"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-6 h-6 rounded-full object-cover border border-sky-500/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-sky-500/15 dark:bg-sky-500/20 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-[10px]">
                  {getInitials(user.displayName)}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors leading-tight">
                  {user.displayName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  {formatRole(user.role)}
                </span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
