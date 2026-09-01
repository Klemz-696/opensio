'use client';

import React, { useEffect } from 'react';
import { Bot, AlertCircle, MessageSquare } from 'lucide-react';
import type { PageContext } from '../../lib/api/chat-api';
import { useMentorChat } from './use-mentor-chat';
import { MentorChatHeader } from './mentor-chat-header';
import { MentorChatMessages } from './mentor-chat-messages';
import { MentorChatInput } from './mentor-chat-input';
import { MentorChatSettings } from './mentor-chat-settings';
import { MentorConversationSidebar } from './mentor-conversation-sidebar';

interface MentorChatDrawerProps {
  currentContext?: PageContext;
}

export function MentorChatDrawer({ currentContext }: MentorChatDrawerProps) {
  const {
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
  } = useMentorChat(currentContext);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!user) return null;

  const currentConv = conversations.find((c) => c.id === activeConvId);

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
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        >
          {/* En-tête avec indicateurs de contexte et actions */}
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

          {/* Panneau rétractable de gestion des discussions */}
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

          {/* Titre de la discussion active */}
          {!showSidebar && currentConv && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="font-semibold truncate">{currentConv.title}</span>
                {currentConv.archivedAt && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Archivée
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline cursor-pointer shrink-0 ml-2"
              >
                Changer
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 m-3 bg-red-500/10 dark:bg-red-950/60 border border-red-500/20 dark:border-red-800/80 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
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
