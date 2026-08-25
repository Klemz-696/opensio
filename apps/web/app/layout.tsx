import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '../lib/auth/auth-context';
import { MentorChatDrawer } from '../components/ai/mentor-chat-drawer';

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
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        <AuthProvider>
          {children}
          <MentorChatDrawer />
        </AuthProvider>
      </body>
    </html>
  );
}
