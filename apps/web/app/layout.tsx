import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '../lib/auth/auth-context';
import { MentorChatDrawer } from '../components/ai/mentor-chat-drawer';
import { ForcePasswordChangeModal } from '../components/auth/force-password-change-modal';
import { ThemeProvider } from '../components/theme/theme-provider';

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
          <AuthProvider>
            {children}
            <ForcePasswordChangeModal />
            <MentorChatDrawer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
