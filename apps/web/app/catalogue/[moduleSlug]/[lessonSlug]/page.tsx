'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft, BookCheck } from 'lucide-react';
import { useAuth } from '../../../../lib/auth/use-auth';
import { fetchLesson, type LessonDetail } from '../../../../lib/api/catalog-api';
import { Breadcrumbs } from '../../../../components/layout/breadcrumbs';
import { LessonHeader } from '../../../../components/lessons/lesson-header';
import { LessonMetadata } from '../../../../components/lessons/lesson-metadata';
import { MarkdownRenderer } from '../../../../components/lessons/markdown-renderer';
import LessonDetailLoading from './loading';

interface LessonPageProps {
  params: Promise<{
    moduleSlug: string;
    lessonSlug: string;
  }>;
}

export default function LessonDetailPage({ params }: LessonPageProps) {
  const resolvedParams = use(params);
  const { moduleSlug, lessonSlug } = resolvedParams;

  const { accessToken } = useAuth();
  const [lessonData, setLessonData] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLesson = async () => {
    if (!accessToken || !lessonSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLesson(lessonSlug, accessToken);
      setLessonData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la leçon.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLesson();
  }, [accessToken, lessonSlug]);

  if (isLoading) {
    return <LessonDetailLoading />;
  }

  if (error || !lessonData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-200">Leçon introuvable</h3>
            <p className="text-sm mt-1 text-rose-300/90">{error || 'La leçon demandée n\'existe pas.'}</p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href={`/catalogue/${moduleSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au module</span>
              </Link>
              <button
                onClick={() => void loadLesson()}
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
    { label: lessonData.module.title, href: `/catalogue/${moduleSlug}` },
    { label: lessonData.title },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumbs items={breadcrumbs} />
      <LessonHeader lesson={lessonData} />
      <LessonMetadata lesson={lessonData} />

      <article className="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-800/90 bg-slate-900/60 shadow-2xl mb-12">
        <MarkdownRenderer content={lessonData.content} />
      </article>

      <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <Link
          href={`/catalogue/${moduleSlug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Retour au module</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BookCheck className="w-4 h-4 text-emerald-400" />
          <span>Leçon consultée avec succès</span>
        </div>
      </div>
    </div>
  );
}
