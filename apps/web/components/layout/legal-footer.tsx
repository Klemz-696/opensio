import React from 'react';
import Link from 'next/link';

export function LegalFooter() {
  return (
    <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/mentions-legales"
          className="hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Mentions légales
        </Link>
        <span>&bull;</span>
        <Link
          href="/confidentialite"
          className="hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Politique de confidentialité
        </Link>
      </div>
    </footer>
  );
}
