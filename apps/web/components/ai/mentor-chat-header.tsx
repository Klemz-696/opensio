'use client';

import React from 'react';
import {
  Bot,
  X,
  Plus,
  ShieldCheck,
  Globe,
  MessageSquare,
  Settings,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { ChatStatus, PageContext } from '../../lib/api/chat-api';

interface MentorChatHeaderProps {
  status: ChatStatus | null;
  resolvedPageContext: PageContext;
  showSidebar: boolean;
  showSettings: boolean;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onNewConversation: () => void;
  onClose: () => void;
}

export function MentorChatHeader({
  status,
  resolvedPageContext,
  showSidebar,
  showSettings,
  onToggleSidebar,
  onToggleSettings,
  onNewConversation,
  onClose,
}: MentorChatHeaderProps) {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            Mentor OpenSIO
            {resolvedPageContext.isEvaluated ? (
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Évaluation Active (Socratique)
              </span>
            ) : resolvedPageContext.pageType === 'quiz-coaching' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                Coaching Quiz
              </span>
            ) : resolvedPageContext.lessonSlug ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 truncate max-w-[130px]">
                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{resolvedPageContext.lessonSlug}</span>
              </span>
            ) : null}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono">{status?.model || 'llama3.1:8b'}</span>
            {status?.mode === 'local' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <ShieldCheck className="w-3 h-3" /> Ollama Local (0 fuite)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[11px]">
                <Globe className="w-3 h-3" /> Distant Chiffré
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Historique des discussions"
          aria-label="Historique des discussions"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            showSidebar ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleSettings}
          title="Préférences IA"
          aria-label="Préférences IA"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            showSettings ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNewConversation}
          title="Nouvelle discussion"
          aria-label="Nouvelle discussion"
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'assistant"
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
