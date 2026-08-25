'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import {
  fetchChatStatus,
  fetchAiModels,
  fetchAiPreferences,
  updateAiPreferences,
  fetchConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  fetchMessages,
  sendChatMessage,
  type ChatStatus,
  type ChatConversationItem,
  type ChatMessageItem,
  type PageContext,
  type AiPreferences,
} from '../../lib/api/chat-api';
import { MentorChatHeader } from './mentor-chat-header';
import { MentorChatMessages } from './mentor-chat-messages';
import { MentorChatInput } from './mentor-chat-input';
import { MentorChatSettings } from './mentor-chat-settings';
import { MentorConversationSidebar } from './mentor-conversation-sidebar';

interface MentorChatDrawerProps {
  currentContext?: PageContext;
}

export function MentorChatDrawer({ currentContext }: MentorChatDrawerProps) {
  const { accessToken, user } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
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
        fetchConversations(accessToken, 'all'),
      ]);

      setStatus(st);
      setAvailableModels(modelsData.models);
      setPreferences(prefs);
      setConversations(convs);

      const activeConvs = convs.filter((c) => !c.archivedAt);
      const targetConv = activeConvs.length > 0 ? activeConvs[0] : convs[0];

      if (targetConv) {
        setActiveConvId(targetConv.id);
        const msgs = await fetchMessages(targetConv.id, accessToken);
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
      setShowSidebar(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de créer une discussion.');
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!accessToken) return;
    try {
      const updated = await updateConversation(convId, { title: newTitle }, accessToken);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: updated.title, isCustomTitle: true } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec du renommage.');
    }
  };

  const handleArchiveConversation = async (convId: string, isArchived: boolean) => {
    if (!accessToken) return;
    try {
      const updated = await updateConversation(convId, { isArchived }, accessToken);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, archivedAt: updated.archivedAt } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec de l’archivage.');
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!accessToken) return;
    try {
      await deleteConversation(convId, accessToken);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);

      if (activeConvId === convId) {
        const nextActive = remaining.find((c) => !c.archivedAt) || remaining[0];
        if (nextActive) {
          setActiveConvId(nextActive.id);
          const msgs = await fetchMessages(nextActive.id, accessToken);
          setMessages(msgs);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression.');
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
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.userMessage,
        res.assistantMessage,
      ]);
      if (status) {
        setStatus({ ...status, remainingQuota: res.remainingQuota });
      }

      if (messages.length === 0) {
        const updatedList = await fetchConversations(accessToken, 'all');
        setConversations(updatedList);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi du message.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const currentConv = conversations.find((c) => c.id === activeConvId);

  return (
    <>
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

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assistant Mentor IA"
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        >
          <MentorChatHeader
            status={status}
            resolvedPageContext={resolvedPageContext}
            showSidebar={showSidebar}
            showSettings={showSettings}
            onToggleSidebar={() => {
              setShowSidebar((v) => !v);
              setShowSettings(false);
            }}
            onToggleSettings={() => {
              setShowSettings((v) => !v);
              setShowSidebar(false);
            }}
            onNewConversation={() => void handleNewConversation()}
            onClose={() => setIsOpen(false)}
          />

          {showSidebar && (
            <MentorConversationSidebar
              conversations={conversations}
              activeConvId={activeConvId}
              onSelectConversation={(id) => void handleSelectConversation(id)}
              onNewConversation={() => void handleNewConversation()}
              onRenameConversation={handleRenameConversation}
              onArchiveConversation={handleArchiveConversation}
              onDeleteConversation={handleDeleteConversation}
              onCloseSidebar={() => setShowSidebar(false)}
            />
          )}

          {showSettings && (
            <MentorChatSettings
              availableModels={availableModels}
              preferences={preferences}
              currentModel={status?.model}
              onSelectModel={(m) => void handleChangeModel(m)}
              onToggleFreeMode={() => void handleToggleFreeMode()}
            />
          )}

          {!showSidebar && currentConv && (
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-semibold truncate">{currentConv.title}</span>
                {currentConv.archivedAt && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Archivée
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer shrink-0 ml-2"
              >
                Changer
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 m-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <MentorChatMessages
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />

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
