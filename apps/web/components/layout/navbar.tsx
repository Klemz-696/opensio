'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, LayoutDashboard, LogOut, ShieldCheck, Terminal, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/catalogue" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                OpenSIO
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  SISR
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-sky-400" />
              <span>Tableau de bord</span>
            </Link>
            <Link
              href="/catalogue"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Catalogue</span>
            </Link>
            {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'admin') && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-300 hover:text-white hover:bg-indigo-950/60 border border-indigo-500/20 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Administration</span>
              </Link>
            )}
          </nav>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white leading-tight">{user.displayName}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {user.role === 'ADMIN' || user.role === 'admin'
                    ? 'Administrateur'
                    : user.role === 'teacher'
                    ? 'Formateur'
                    : 'Apprenant'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
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
