'use client';

import React from 'react';
import {
  MessageSquare,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import type { ChatConversationItem } from '../../lib/api/chat-api';

interface MentorConversationItemProps {
  conversation: ChatConversationItem;
  isActive: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  editTitle: string;
  isProcessing: boolean;
  isArchivedList?: boolean;
  onSelect: (convId: string) => void;
  onStartRename: (conv: ChatConversationItem, e: React.MouseEvent) => void;
  onCancelRename: (e?: React.MouseEvent) => void;
  onEditTitleChange: (val: string) => void;
  onSubmitRename: (convId: string, e?: React.MouseEvent | React.FormEvent) => void;
  onArchive: (conv: ChatConversationItem, e: React.MouseEvent) => void;
  onStartDelete: (convId: string, e: React.MouseEvent) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (convId: string, e: React.MouseEvent) => void;
}

export function MentorConversationItem({
  conversation,
  isActive,
  isEditing,
  isDeleting,
  editTitle,
  isProcessing,
  isArchivedList = false,
  onSelect,
  onStartRename,
  onCancelRename,
  onEditTitleChange,
  onSubmitRename,
  onArchive,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
}: MentorConversationItemProps) {
  if (isDeleting) {
    return (
      <div className="p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/80 border border-rose-500/40 text-xs space-y-2 animate-in fade-in duration-150">
        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Supprimer définitivement ?</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelDelete();
            }}
            disabled={isProcessing}
            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={(e) => onConfirmDelete(conversation.id, e)}
            disabled={isProcessing}
            aria-label={`Confirmer la suppression de ${conversation.title}`}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] cursor-pointer shadow-sm"
          >
            Confirmer
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-500/60 flex items-center gap-1.5 text-xs">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmitRename(conversation.id, e);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancelRename();
            }
          }}
          autoFocus
          aria-label="Nouveau titre de la discussion"
          className="flex-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={(e) => onSubmitRename(conversation.id, e)}
          disabled={!editTitle.trim() || isProcessing}
          aria-label="Enregistrer le nouveau titre"
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancelRename}
          aria-label="Annuler le renommage"
          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation.id);
        }
      }}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`Discussion : ${conversation.title}`}
      className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
        isActive
          ? 'bg-indigo-600/15 dark:bg-indigo-600/25 border border-indigo-500/50 text-indigo-950 dark:text-white shadow-sm'
          : 'bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <MessageSquare
          className={`w-3.5 h-3.5 shrink-0 ${
            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
          }`}
        />
        <div className="min-w-0">
          <span className="font-medium truncate block">{conversation.title}</span>
          <span className="text-[10px] text-slate-500 block">
            {conversation._count?.messages ? `${conversation._count.messages} msg` : 'Nouvelle'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={(e) => onStartRename(conversation, e)}
          aria-label={`Renommer ${conversation.title}`}
          title="Renommer"
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => onArchive(conversation, e)}
          aria-label={isArchivedList ? `Désarchiver ${conversation.title}` : `Archiver ${conversation.title}`}
          title={isArchivedList ? 'Désarchiver' : 'Archiver'}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          {isArchivedList ? (
            <ArchiveRestore className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Archive className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => onStartDelete(conversation.id, e)}
          aria-label={`Supprimer ${conversation.title}`}
          title="Supprimer"
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
