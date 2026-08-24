'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { fetchTracks, fetchTrackModules, type TrackSummary, type ModuleSummary } from '../../lib/api/catalog-api';
import { TrackSection } from '../../components/catalog/track-section';

interface TrackWithModules {
  track: TrackSummary;
  modules: ModuleSummary[];
}

export default function CataloguePage() {
  const { accessToken } = useAuth();
  const [tracksData, setTracksData] = useState<TrackWithModules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogue = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const tracks = await fetchTracks(accessToken);
      const withModules = await Promise.all(
        tracks.map(async (track) => {
          const modules = await fetchTrackModules(track.slug, accessToken);
          return { track, modules };
        }),
      );
      setTracksData(withModules);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogue();
  }, [accessToken]);

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Catalogue de Formation BTS SIO SISR
          </h1>
        </div>
        <p className="text-sm text-slate-400 max-w-3xl">
          Parcourez l'ensemble des modules d'apprentissage organisés par année de formation.
          Chaque module comprend des cours théoriques approfondis, des quiz et des exercices pratiques.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm font-medium">Chargement des modules du catalogue...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-200">Erreur de chargement du catalogue</h3>
            <p className="text-sm mt-1 text-rose-300/90">{error}</p>
            <button
              onClick={() => void loadCatalogue()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        </div>
      ) : tracksData.length === 0 ? (
        <div className="p-12 rounded-2xl glass-panel text-center text-slate-400">
          <p className="text-base font-semibold text-white">Aucun cours publié pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            L'administrateur peut synchroniser le contenu via la commande <code>content:sync</code>.
          </p>
        </div>
      ) : (
        <div>
          {tracksData.map(({ track, modules }) => (
            <TrackSection key={track.id} track={track} modules={modules} />
          ))}
        </div>
      )}
    </div>
  );
}
