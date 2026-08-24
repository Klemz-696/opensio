'use client';

import React from 'react';
import { Send, Sparkles } from 'lucide-react';

interface MentorChatInputProps {
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  remainingQuota: number;
  rateLimitHourly: number;
  mode: 'local' | 'remote' | 'disabled';
}

export function MentorChatInput({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isLoading,
  remainingQuota,
  rateLimitHourly,
  mode,
}: MentorChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const isQuotaDepleted = remainingQuota <= 0;
  const isDisabled = isLoading || isQuotaDepleted || mode === 'disabled';

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800">
      <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500/50 transition-colors">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={2}
          placeholder={
            mode === 'disabled'
              ? 'Assistant désactivé sur cette instance'
              : isQuotaDepleted
                ? 'Quota horaire atteint'
                : 'Pose ta question à Mentor (Entrée pour envoyer)...'
          }
          className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans focus:ring-0 p-1"
        />

        <button
          type="button"
          onClick={onSendMessage}
          disabled={!inputMessage.trim() || isDisabled}
          aria-label="Envoyer le message"
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>{remainingQuota} / {rateLimitHourly} messages restants cette heure</span>
        </div>
        <span className="hidden sm:inline text-slate-600">Shift + Entrée pour nouvelle ligne</span>
      </div>
    </div>
  );
}
