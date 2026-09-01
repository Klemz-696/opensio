import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '../lib/auth/auth-context';
import { ThemeProvider } from '../components/theme/theme-provider';
import { AppOverlays } from '../components/layout/app-overlays';
import { NavigationProgress } from '../components/layout/navigation-progress';

export const metadata: Metadata = {
  title: 'OpenSIO — Plateforme de formation pratique BTS SIO SISR',
  description:
    'Plateforme auto-hébergée de formation et de révision pratique pour le BTS SIO option SISR.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-sky-500 text-white px-4 py-2 rounded-md font-semibold focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:focus-visible:ring-sky-400"
          >
            Aller au contenu principal
          </a>
          <NavigationProgress />
          <AuthProvider>
            {children}
            <AppOverlays />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
