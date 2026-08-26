'use client';

import React from 'react';
import { Bot, User, ShieldCheck } from 'lucide-react';
import type { ChatMessageItem } from '../../lib/api/chat-api';

interface MentorChatMessagesProps {
  messages: ChatMessageItem[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MentorChatMessages({
  messages,
  isLoading,
  messagesEndRef,
}: MentorChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
          <Bot className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Mentor OpenSIO</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
          Pose-moi une question sur le cours, les notions réseau/système ou demande un indice méthodologique pour ton atelier !
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400/90 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Accompagnement pédagogique garanti sans spoil</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      {messages.map((msg, idx) => {
        const isUser = msg.role.toLowerCase() === 'user';
        const uniqueKey = msg.id ? `${msg.id}-${idx}` : `msg-${idx}-${Date.now()}`;
        return (
          <div
            key={uniqueKey}
            className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 text-slate-500">Mentor réfléchit...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
