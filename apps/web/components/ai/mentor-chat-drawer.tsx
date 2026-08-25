'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  X,
  Plus,
  ShieldCheck,
  Globe,
  AlertCircle,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import {
  fetchChatStatus,
  fetchAiModels,
  fetchAiPreferences,
  updateAiPreferences,
  fetchConversations,
  createConversation,
  fetchMessages,
  sendChatMessage,
  type ChatStatus,
  type ChatConversationItem,
  type ChatMessageItem,
  type PageContext,
  type AiPreferences,
} from '../../lib/api/chat-api';
import { MentorChatMessages } from './mentor-chat-messages';
import { MentorChatInput } from './mentor-chat-input';
import { MentorChatSettings } from './mentor-chat-settings';

interface MentorChatDrawerProps {
  currentContext?: PageContext;
}

export function MentorChatDrawer({ currentContext }: MentorChatDrawerProps) {
  const { accessToken, user } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [preferences, setPreferences] = useState<AiPreferences>({ preferredModel: null, freeMode: false });
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3.1:8b']);
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Résolution automatique du contexte de la page courante
  const resolvedPageContext = useMemo<PageContext>(() => {
    if (currentContext) return currentContext;
    if (!pathname) return { pageType: 'general' };
    const parts = pathname.split('/').filter(Boolean);

    if (parts[0] === 'catalogue' && parts[2] === 'labs' && parts[3]) {
      return { pageType: 'lab', pageSlug: parts[3], labSlug: parts[3], moduleSlug: parts[1], isEvaluated: true };
    }
    if (parts[0] === 'catalogue' && parts[2] === 'quiz' && parts[3]) {
      return { pageType: 'quiz', pageSlug: parts[3], quizSlug: parts[3], moduleSlug: parts[1], isEvaluated: true };
    }
    if (parts[0] === 'catalogue' && parts.length === 3) {
      return { pageType: 'lesson', pageSlug: parts[2], lessonSlug: parts[2], moduleSlug: parts[1], isEvaluated: false };
    }
    if (parts[0] === 'catalogue' && parts.length === 2) {
      return { pageType: 'module', pageSlug: parts[1], moduleSlug: parts[1], isEvaluated: false };
    }
    return { pageType: 'general', isEvaluated: false };
  }, [pathname, currentContext]);

  // Charger le statut, les préférences et les conversations à l'ouverture
  useEffect(() => {
    if (isOpen && accessToken) {
      void loadInitialData();
    }
  }, [isOpen, accessToken]);

  const loadInitialData = async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const [st, modelsData, prefs, convs] = await Promise.all([
        fetchChatStatus(accessToken),
        fetchAiModels(accessToken),
        fetchAiPreferences(accessToken),
        fetchConversations(accessToken),
      ]);

      setStatus(st);
      setAvailableModels(modelsData.models);
      setPreferences(prefs);
      setConversations(convs);

      if (convs.length > 0) {
        const firstConv = convs[0];
        setActiveConvId(firstConv.id);
        const msgs = await fetchMessages(firstConv.id, accessToken);
        setMessages(msgs);
      } else {
        const newConv = await createConversation(accessToken, {
          title: resolvedPageContext.labSlug
            ? `Lab : ${resolvedPageContext.labSlug}`
            : resolvedPageContext.quizSlug
              ? `Quiz : ${resolvedPageContext.quizSlug}`
              : resolvedPageContext.lessonSlug
                ? `Cours : ${resolvedPageContext.lessonSlug}`
                : 'Discussion générale',
          context: resolvedPageContext,
        });
        setConversations([newConv]);
        setActiveConvId(newConv.id);
        setMessages([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de contacter l’assistant.');
    }
  };

  const handleSelectConversation = async (convId: string) => {
    if (!accessToken || convId === activeConvId) return;
    setActiveConvId(convId);
    setError(null);
    try {
      const msgs = await fetchMessages(convId, accessToken);
      setMessages(msgs);
    } catch {
      setError('Impossible de charger cette discussion.');
    }
  };

  const handleNewConversation = async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const newConv = await createConversation(accessToken, {
        title: resolvedPageContext.labSlug
          ? `Lab : ${resolvedPageContext.labSlug}`
          : resolvedPageContext.quizSlug
            ? `Quiz : ${resolvedPageContext.quizSlug}`
            : resolvedPageContext.lessonSlug
              ? `Cours : ${resolvedPageContext.lessonSlug}`
              : `Discussion #${conversations.length + 1}`,
        context: resolvedPageContext,
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de créer une discussion.');
    }
  };

  const handleToggleFreeMode = async () => {
    if (!accessToken) return;
    const newFreeMode = !preferences.freeMode;
    try {
      const updated = await updateAiPreferences({ freeMode: newFreeMode }, accessToken);
      setPreferences((prev) => ({ ...prev, freeMode: updated.freeMode }));
    } catch {
      setError('Échec de mise à jour du mode libre.');
    }
  };

  const handleChangeModel = async (model: string) => {
    if (!accessToken) return;
    try {
      const updated = await updateAiPreferences({ preferredModel: model }, accessToken);
      setPreferences((prev) => ({ ...prev, preferredModel: updated.preferredModel }));
      if (status) {
        setStatus({ ...status, model });
      }
    } catch {
      setError('Échec de sélection du modèle.');
    }
  };

  const handleSendMessage = async () => {
    if (!accessToken || !activeConvId || !inputMessage.trim() || isLoading) return;

    const content = inputMessage.trim();
    const tempId = `temp-${Date.now()}`;
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // Message utilisateur optimiste temporaire avec ID garanti unique
    const tempUserMsg: ChatMessageItem = {
      id: tempId,
      conversationId: activeConvId,
      role: 'USER',
      content,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(activeConvId, content, accessToken, resolvedPageContext);
      // Réconciliation des IDs sans risque de duplication de clé
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.userMessage,
        res.assistantMessage,
      ]);
      if (status) {
        setStatus({ ...status, remainingQuota: res.remainingQuota });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi du message.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Bouton flottant d'ouverture du chat */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir l'assistant Mentor IA"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm rounded-full shadow-xl hover:shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-105 cursor-pointer"
      >
        <Bot className="w-5 h-5 text-indigo-200 animate-pulse" />
        <span className="font-sans">Mentor IA</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      </button>

      {/* Panneau latéral (Drawer) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assistant Mentor IA"
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        >
          {/* Header du Drawer */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  Mentor OpenSIO
                  {resolvedPageContext.isEvaluated && (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Évaluation Active (Socratique)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="text-slate-300 text-[11px] font-mono">{status?.model || 'llama3.1:8b'}</span>
                  {status?.mode === 'local' ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <ShieldCheck className="w-3 h-3" /> Ollama Local (0 fuite)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-400 text-[11px]">
                      <Globe className="w-3 h-3" /> Distant Chiffré
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                title="Préférences IA"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showSettings ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleNewConversation()}
                title="Nouvelle discussion"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer l'assistant"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panneau rétractable des préférences étudiant */}
          {showSettings && (
            <MentorChatSettings
              availableModels={availableModels}
              preferences={preferences}
              currentModel={status?.model}
              onSelectModel={(m) => void handleChangeModel(m)}
              onToggleFreeMode={() => void handleToggleFreeMode()}
            />
          )}

          {/* Sélecteur de discussions */}
          {conversations.length > 1 && (
            <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void handleSelectConversation(c.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer text-xs ${
                    c.id === activeConvId
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 m-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Liste des messages avec clés garanties uniques */}
          <MentorChatMessages
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />

          {/* Zone de saisie */}
          <MentorChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={() => void handleSendMessage()}
            isLoading={isLoading}
            remainingQuota={status?.remainingQuota ?? 20}
            rateLimitHourly={status?.rateLimitHourly ?? 20}
            mode={status?.mode ?? 'local'}
          />
        </div>
      )}
    </>
  );
}
