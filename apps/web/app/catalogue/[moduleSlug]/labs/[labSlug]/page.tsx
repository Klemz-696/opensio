'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../lib/auth/use-auth';
import {
  fetchLab,
  fetchLabSession,
  startLabSession,
  saveLabFiles,
  validateLabSession,
  consumeLabHint,
  stopLabSession,
  type LabPublicDetail,
  type LabSession,
  type LabVerdict as LabVerdictType,
} from '../../../../../lib/api/labs-api';
import { Breadcrumbs } from '../../../../../components/layout/breadcrumbs';
import { LabHeader } from '../../../../../components/labs/lab-header';
import { LabContext } from '../../../../../components/labs/lab-context';
import { LabEditor } from '../../../../../components/labs/lab-editor';
import { LabTerminal } from '../../../../../components/labs/lab-terminal';
import { LabHints } from '../../../../../components/labs/lab-hints';
import { LabVerdict } from '../../../../../components/labs/lab-verdict';
import { LabSessionControls } from '../../../../../components/labs/lab-session-controls';
import LabDetailLoading from './loading';
import { Code, Terminal as TerminalIcon } from 'lucide-react';

interface LabPageProps {
  params: Promise<{
    moduleSlug: string;
    labSlug: string;
  }>;
}

export default function LabPage({ params }: LabPageProps) {
  const resolvedParams = use(params);
  const { moduleSlug, labSlug } = resolvedParams;

  const { accessToken } = useAuth();
  const [lab, setLab] = useState<LabPublicDetail | null>(null);
  const [session, setSession] = useState<LabSession | null>(null);
  const [verdict, setVerdict] = useState<LabVerdictType | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLabData = async () => {
    if (!accessToken || !labSlug) return;
    setIsLoading(true);
    setError(null);

    try {
      const labData = await fetchLab(labSlug, accessToken);
      setLab(labData);

      if (labData.activeSessionId) {
        try {
          const sessionData = await fetchLabSession(labSlug, labData.activeSessionId, accessToken);
          setSession(sessionData);
          if (sessionData.lastResult) {
            setVerdict({
              ...sessionData.lastResult,
              status: sessionData.status,
            });
          }
        } catch {
          // Session introuvable ou expirée
          setSession(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le lab.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLabData();
  }, [accessToken, labSlug]);

  const handleStartSession = async () => {
    if (!accessToken || !labSlug) return;
    setIsStarting(true);
    setError(null);
    try {
      const newSession = await startLabSession(labSlug, accessToken);
      setSession(newSession);
      setVerdict(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec du démarrage de la session.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveFiles = async (files: Array<{ path: string; content: string }>) => {
    if (!accessToken || !labSlug || !session) return;
    await saveLabFiles(labSlug, session.id, files, accessToken);
    setSession((prev) => (prev ? { ...prev, files } : null));
  };

  const handleConsumeHint = async () => {
    if (!accessToken || !labSlug || !session) return;
    const res = await consumeLabHint(labSlug, session.id, accessToken);
    setSession((prev) => {
      if (!prev) return null;
      const newUnlocked = [
        ...prev.unlockedHints,
        {
          index: res.hintIndex,
          costPercent: res.costPercent,
          text: res.text,
        },
      ];
      return {
        ...prev,
        hintsUsed: res.hintsUsed,
        unlockedHints: newUnlocked,
      };
    });
  };

  const handleValidateSession = async () => {
    if (!accessToken || !labSlug || !session) return;
    setIsValidating(true);
    setError(null);
    try {
      const v = await validateLabSession(labSlug, session.id, accessToken, session.files);
      setVerdict(v);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: v.status,
              score: v.score,
              lastResult: v,
            }
          : null
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleStopSession = async () => {
    if (!accessToken || !labSlug || !session) return;
    if (confirm('Êtes-vous sûr de vouloir abandonner cette session ?')) {
      try {
        const stopped = await stopLabSession(labSlug, session.id, accessToken);
        setSession(stopped);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Échec de l’arrêt de la session.');
      }
    }
  };

  if (isLoading) {
    return <LabDetailLoading />;
  }

  if (error && !lab) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-200">Atelier introuvable</h3>
            <p className="text-sm mt-1 text-rose-300/90">{error}</p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href={`/catalogue/${moduleSlug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au module</span>
              </Link>
              <button
                onClick={() => void loadLabData()}
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

  if (!lab) return null;

  const breadcrumbs = [
    { label: 'Module', href: `/catalogue/${moduleSlug}` },
    { label: `Lab : ${lab.title}` },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Breadcrumbs items={breadcrumbs} />

      <LabHeader lab={lab} session={session} />

      <LabSessionControls
        session={session}
        isValidating={isValidating}
        isStarting={isStarting}
        onStartSession={handleStartSession}
        onValidateSession={handleValidateSession}
        onStopSession={handleStopSession}
      />

      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {verdict && (
        <LabVerdict
          verdict={verdict}
          maxScore={lab.maxScore}
          onRetry={() => setVerdict(null)}
        />
      )}

      {session && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Éditeur de fichiers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              <span>Terminal interactif</span>
            </button>
          </div>

          {activeTab === 'editor' ? (
            <LabEditor
              files={session.files}
              editableFilesInfo={lab.editableFiles}
              isReadOnly={session.status !== 'running'}
              onSave={handleSaveFiles}
            />
          ) : (
            <div className="h-[500px]">
              <LabTerminal
                labSlug={lab.slug}
                sessionId={session.id}
                token={accessToken || ''}
              />
            </div>
          )}
        </div>
      )}

      {session && lab.hintsSummary.length > 0 && (
        <LabHints
          unlockedHints={session.unlockedHints}
          totalHints={lab.hintsCount}
          hintsSummary={lab.hintsSummary}
          isSessionActive={session.status === 'running'}
          onConsumeHint={handleConsumeHint}
        />
      )}

      <LabContext lab={lab} sessionId={session?.id} />
    </div>
  );
}
