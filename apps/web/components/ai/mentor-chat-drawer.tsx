'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Plus, ShieldCheck, Globe, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import {
  fetchChatStatus,
  fetchConversations,
  createConversation,
  fetchMessages,
  sendChatMessage,
  type ChatStatus,
  type ChatConversationItem,
  type ChatMessageItem,
} from '../../lib/api/chat-api';
import { MentorChatMessages } from './mentor-chat-messages';
import { MentorChatInput } from './mentor-chat-input';

interface MentorChatDrawerProps {
  currentContext?: {
    labSlug?: string;
    lessonSlug?: string;
  };
}

export function MentorChatDrawer({ currentContext }: MentorChatDrawerProps) {
  const { accessToken, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger le statut IA et les conversations à l'ouverture
  useEffect(() => {
    if (isOpen && accessToken) {
      void loadInitialData();
    }
  }, [isOpen, accessToken]);

  const loadInitialData = async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const st = await fetchChatStatus(accessToken);
      setStatus(st);

      const convs = await fetchConversations(accessToken);
      setConversations(convs);

      if (convs.length > 0) {
        const firstConv = convs[0];
        setActiveConvId(firstConv.id);
        const msgs = await fetchMessages(firstConv.id, accessToken);
        setMessages(msgs);
      } else {
        // Créer automatiquement une première conversation avec le contexte actuel
        const newConv = await createConversation(accessToken, {
          title: currentContext?.labSlug ? `Lab : ${currentContext.labSlug}` : 'Discussion générale',
          context: currentContext,
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
        title: currentContext?.labSlug ? `Lab : ${currentContext.labSlug}` : `Discussion #${conversations.length + 1}`,
        context: currentContext,
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de créer une discussion.');
    }
  };

  const handleSendMessage = async () => {
    if (!accessToken || !activeConvId || !inputMessage.trim() || isLoading) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // Message utilisateur optimiste temporaire
    const tempUserMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      conversationId: activeConvId,
      role: 'USER',
      content,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(activeConvId, content, accessToken, currentContext);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), res.userMessage, res.assistantMessage]);
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
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
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
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Tuteur SISR
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  {status?.mode === 'local' ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Ollama Local (0 donnée partagée)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-400 text-[11px]">
                      <Globe className="w-3.5 h-3.5" /> Mode Distant Chiffré
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
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

          {/* Bandeau d'information contextuel / sélecteur de discussions */}
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

          {/* Liste des messages */}
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
