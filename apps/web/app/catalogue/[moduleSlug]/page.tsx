'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../lib/auth/use-auth';
import { fetchModule, type ModuleDetail } from '../../../lib/api/catalog-api';
import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import { ModuleHeader } from '../../../components/catalog/module-header';
import { ModuleLessonsList } from '../../../components/catalog/module-lessons-list';
import { ModuleQuizzesList } from '../../../components/catalog/module-quizzes-list';
import { ModuleLabsList } from '../../../components/catalog/module-labs-list';
import ModuleDetailLoading from './loading';

interface ModulePageProps {
  params: Promise<{
    moduleSlug: string;
  }>;
}

export default function ModuleDetailPage({ params }: ModulePageProps) {
  const resolvedParams = use(params);
  const { moduleSlug } = resolvedParams;

  const { accessToken } = useAuth();
  const [moduleData, setModuleData] = useState<ModuleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModule = async () => {
    if (!accessToken || !moduleSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchModule(moduleSlug, accessToken);
      setModuleData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le module.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadModule();
  }, [accessToken, moduleSlug]);

  if (isLoading) {
    return <ModuleDetailLoading />;
  }

  if (error || !moduleData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-200">Module introuvable</h3>
            <p className="text-sm mt-1 text-rose-300/90">{error || 'Le module demandé n\'existe pas.'}</p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au catalogue</span>
              </Link>
              <button
                onClick={() => void loadModule()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: moduleData.title },
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <ModuleHeader module={moduleData} />
      <ModuleLessonsList moduleSlug={moduleData.slug} lessons={moduleData.lessons} />
      <ModuleQuizzesList moduleSlug={moduleData.slug} quizzes={moduleData.quizzes} />
      <ModuleLabsList moduleSlug={moduleData.slug} labs={moduleData.labs} />
    </div>
  );
}
