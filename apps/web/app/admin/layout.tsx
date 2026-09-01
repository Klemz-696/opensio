import React from 'react';
import { Navbar } from '../../components/layout/navbar';
import { AdminRoute } from '../../components/auth/admin-route';

export const metadata = {
  title: 'Administration — OpenSIO',
  description: 'Panneau d\'administration et gestion des utilisateurs OpenSIO',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminRoute>{children}</AdminRoute>
      </main>
    </div>
  );
}
