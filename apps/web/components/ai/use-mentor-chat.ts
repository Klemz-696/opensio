'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
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

export function useMentorChat(currentContext?: PageContext) {
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

  useEffect(() => {
    if (isOpen && accessToken) {
      void loadInitialData();
    }
  }, [isOpen, accessToken]);

  // Écoute de l'événement global opensio:open-mentor
  useEffect(() => {
    const handleOpenMentorEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        initialMessage?: string;
        title?: string;
        context?: PageContext;
      }>;
      const detail = customEvent.detail;
      setIsOpen(true);
      setShowSidebar(false);
      setShowSettings(false);

      if (!accessToken) return;

      if (detail?.context || detail?.initialMessage) {
        setIsLoading(true);
        setError(null);
        try {
          const newConv = await createConversation(accessToken, {
            title: detail.title || 'Coaching Quiz',
            context: detail.context || resolvedPageContext,
          });
          setConversations((prev) => [newConv, ...prev]);
          setActiveConvId(newConv.id);

          if (detail.initialMessage) {
            const tempId = `temp-${Date.now()}`;
            const tempUserMsg: ChatMessageItem = {
              id: tempId,
              conversationId: newConv.id,
              role: 'USER',
              content: detail.initialMessage,
              tokensUsed: 0,
              createdAt: new Date().toISOString(),
            };
            setMessages([tempUserMsg]);

            const res = await sendChatMessage(
              newConv.id,
              detail.initialMessage,
              accessToken,
              detail.context || resolvedPageContext
            );
            setMessages([res.userMessage, res.assistantMessage]);
            if (status) {
              setStatus((prev) => (prev ? { ...prev, remainingQuota: res.remainingQuota } : prev));
            }
          } else {
            setMessages([]);
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Erreur lors de l’ouverture du coaching.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('opensio:open-mentor', handleOpenMentorEvent);
    return () => {
      window.removeEventListener('opensio:open-mentor', handleOpenMentorEvent);
    };
  }, [accessToken, resolvedPageContext, status]);

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

  return {
    user,
    isOpen,
    setIsOpen,
    showSettings,
    setShowSettings,
    showSidebar,
    setShowSidebar,
    status,
    preferences,
    availableModels,
    conversations,
    activeConvId,
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    error,
    messagesEndRef,
    resolvedPageContext,
    handleSelectConversation,
    handleNewConversation,
    handleRenameConversation,
    handleArchiveConversation,
    handleDeleteConversation,
    handleToggleFreeMode,
    handleChangeModel,
    handleSendMessage,
  };
}
