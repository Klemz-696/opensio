'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { ProtectedRoute } from '../../components/auth/protected-route';
import { fetchDashboard, type DashboardData } from '../../lib/api/progress-api';
import { DashboardHeader } from '../../components/dashboard/dashboard-header';
import { DashboardStats } from '../../components/dashboard/dashboard-stats';
import { DashboardResume } from '../../components/dashboard/dashboard-resume';
import { DashboardRecommendations } from '../../components/dashboard/dashboard-recommendations';
import { DashboardTracks } from '../../components/dashboard/dashboard-tracks';
import { DashboardQuizzes } from '../../components/dashboard/dashboard-quizzes';
import { DashboardActivity } from '../../components/dashboard/dashboard-activity';
import DashboardLoading from './loading';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const dashboardData = await fetchDashboard(accessToken);
      setData(dashboardData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les données du tableau de bord.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [accessToken]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-200">
              Erreur de chargement du tableau de bord
            </h3>
            <p className="text-sm mt-1 text-rose-300/90">
              {error || 'Une erreur inattendue est survenue.'}
            </p>
            <button
              onClick={() => void loadData()}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4">
      <DashboardHeader displayName={user?.displayName} overview={data.overview} />
      <DashboardStats overview={data.overview} />
      <DashboardRecommendations recommendations={data.recommendations} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DashboardResume items={data.resume} />
          <DashboardTracks tracks={data.tracksProgress} />
        </div>

        <div>
          <DashboardQuizzes quizzes={data.recentQuizzes} />
          <DashboardActivity events={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
