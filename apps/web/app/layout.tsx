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
