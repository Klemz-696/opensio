import React, { useState, useEffect } from 'react';
import { FileCode, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';
import type { LabEditableFile } from '../../lib/api/labs-api';

interface LabEditorProps {
  files: Array<{ path: string; content: string }>;
  editableFilesInfo: LabEditableFile[];
  isReadOnly?: boolean;
  onSave: (files: Array<{ path: string; content: string }>) => Promise<void>;
  onResetToStarter?: () => void;
}

export function LabEditor({
  files,
  editableFilesInfo,
  isReadOnly = false,
  onSave,
  onResetToStarter,
}: LabEditorProps) {
  const [activeFilePath, setActiveFilePath] = useState<string>(
    files[0]?.path || editableFilesInfo[0]?.path || ''
  );
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchroniser les fichiers initiaux
  useEffect(() => {
    const initialMap: Record<string, string> = {};
    for (const f of files) {
      initialMap[f.path] = f.content;
    }
    for (const ef of editableFilesInfo) {
      if (initialMap[ef.path] === undefined) {
        initialMap[ef.path] = ef.initialContent || '';
      }
    }
    setFileContents(initialMap);
    if (!activeFilePath && files[0]?.path) {
      setActiveFilePath(files[0].path);
    }
  }, [files, editableFilesInfo]);

  const currentContent = fileContents[activeFilePath] || '';
  const currentFileInfo = editableFilesInfo.find((f) => f.path === activeFilePath);

  const handleContentChange = (newVal: string) => {
    if (isReadOnly) return;
    setFileContents((prev) => ({
      ...prev,
      [activeFilePath]: newVal,
    }));
    setSavedSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = Object.entries(fileContents).map(([path, content]) => ({
        path,
        content,
      }));
      await onSave(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Échec de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (isReadOnly || !currentFileInfo) return;
    if (confirm(`Réinitialiser le fichier ${activeFilePath} à son contenu de départ ?`)) {
      handleContentChange(currentFileInfo.initialContent || '');
      if (onResetToStarter) onResetToStarter();
    }
  };

  const allAvailablePaths = editableFilesInfo.map((f) => f.path);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 mb-8 flex flex-col">
      {/* Barre d'onglets de fichiers */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {allAvailablePaths.map((p) => {
            const isActive = p === activeFilePath;
            return (
              <button
                key={p}
                onClick={() => setActiveFilePath(p)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-300 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{p}</span>
              </button>
            );
          })}
        </div>

        {/* Actions sur les fichiers */}
        <div className="flex items-center gap-2">
          {currentFileInfo?.initialContent !== undefined && !isReadOnly && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
              title="Réinitialiser au contenu d'origine"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : savedSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savedSuccess ? 'Enregistré !' : 'Enregistrer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Description du format attendu */}
      {currentFileInfo?.description && (
        <div className="bg-slate-900/40 border-b border-slate-800/80 px-4 py-2 text-xs text-slate-400 font-mono">
          <span className="text-slate-500 mr-2">Structure attendue :</span>
          <span className="text-slate-300">{currentFileInfo.description}</span>
        </div>
      )}

      {saveError && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Zone d'édition de code */}
      <div className="relative">
        <textarea
          value={currentContent}
          onChange={(e) => handleContentChange(e.target.value)}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          rows={14}
          spellCheck={false}
          className={`w-full p-4 bg-slate-950/90 text-slate-100 font-mono text-xs sm:text-sm leading-relaxed outline-none resize-y border-none focus:ring-1 focus:ring-emerald-500/50 ${
            isReadOnly ? 'opacity-80 cursor-not-allowed' : ''
          }`}
          placeholder="Saisissez ou éditez les données ici..."
        />
      </div>
    </div>
  );
}
