'use client';

import React, { Suspense } from 'react';
import { RegisterForm } from '../../components/auth/register-form';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Dynamic background accents */}
      <div className="absolute top-1/4 right-1/2 translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-sky-600/10 blur-[100px] rounded-full pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500 dark:text-sky-400" />
            <span>Chargement du formulaire...</span>
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  );
}
