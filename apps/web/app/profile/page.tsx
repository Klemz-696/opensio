'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Lock,
  ShieldCheck,
  Sliders,
  User as UserIcon,
} from 'lucide-react';
import { Navbar } from '../../components/layout/navbar';
import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { useAuth } from '../../lib/auth/use-auth';
import { getProfileApi, type UserFullProfile } from '../../lib/api/profile';
import { ProfileHeader } from '../../components/profile/profile-header';
import { AvatarUploader } from '../../components/profile/avatar-uploader';
import { ProfileEditor } from '../../components/profile/profile-editor';
import { ProfilePreferences } from '../../components/profile/profile-preferences';
import { ProfileSecurity } from '../../components/profile/profile-security';
import { ProfileRgpd } from '../../components/profile/profile-rgpd';

type ProfileTab = 'info' | 'preferences' | 'security' | 'rgpd';

export default function ProfilePage() {
  const { user, accessToken, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [profileData, setProfileData] = useState<UserFullProfile | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!accessToken) return;

      const res = await getProfileApi(accessToken);
      if (isMounted) {
        if (res.success && res.data) {
          setProfileData(res.data);
        }
      }
    }

    if (isAuthenticated && accessToken) {
      void loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, accessToken]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-sky-500 dark:text-sky-400" />
            <span>Chargement du profil...</span>
          </div>
        </main>
      </div>
    );
  }

  const tabs: { key: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'info', label: 'Profil & Avatar', icon: UserIcon },
    { key: 'preferences', label: 'Préférences', icon: Sliders },
    { key: 'security', label: 'Sécurité', icon: Lock },
    { key: 'rgpd', label: 'RGPD & Données', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Tableau de bord', href: '/dashboard' },
            { label: 'Profil utilisateur' },
          ]}
        />

        <ProfileHeader
          memberSince={profileData?.createdAt || user?.createdAt}
          lastLogin={profileData?.lastLoginAt || user?.lastLoginAt}
          bio={profileData?.bio || user?.bio}
        />

        {/* Navigation par onglets */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <AvatarUploader />
              <ProfileEditor initialBio={profileData?.bio || user?.bio} />
            </div>
          )}

          {activeTab === 'preferences' && (
            <ProfilePreferences
              initialTheme={profileData?.preferences?.theme || 'dark'}
              initialSoundEffects={profileData?.preferences?.soundEffects ?? true}
              initialAiFreeMode={profileData?.aiPreference?.freeMode ?? false}
              initialAiModel={profileData?.aiPreference?.preferredModel || 'deepseek-r1:14b'}
            />
          )}

          {activeTab === 'security' && <ProfileSecurity />}

          {activeTab === 'rgpd' && <ProfileRgpd />}
        </div>
      </main>
    </div>
  );
}
