'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChatConversationItem } from '../../lib/api/chat-api';
import { MentorConversationItem } from './mentor-conversation-item';

interface MentorConversationSidebarProps {
  conversations: ChatConversationItem[];
  activeConvId: string | null;
  onSelectConversation: (convId: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (convId: string, newTitle: string) => Promise<void>;
  onArchiveConversation: (convId: string, isArchived: boolean) => Promise<void>;
  onDeleteConversation: (convId: string) => Promise<void>;
  onCloseSidebar?: () => void;
}

export function MentorConversationSidebar({
  conversations,
  activeConvId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  onCloseSidebar,
}: MentorConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeConversations = conversations.filter((c) => !c.archivedAt);
  const archivedConversations = conversations.filter((c) => Boolean(c.archivedAt));

  const handleStartRename = (conv: ChatConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setDeletingId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleSubmitRename = async (convId: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    if (!editTitle.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await onRenameConversation(convId, editTitle.trim());
      setEditingId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async (conv: ChatConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onArchiveConversation(conv.id, !conv.archivedAt);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartDelete = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(convId);
    setEditingId(null);
  };

  const handleConfirmDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onDeleteConversation(convId);
      setDeletingId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderItem = (conv: ChatConversationItem, isArchivedList = false) => (
    <MentorConversationItem
      key={conv.id}
      conversation={conv}
      isActive={conv.id === activeConvId}
      isEditing={conv.id === editingId}
      isDeleting={conv.id === deletingId}
      editTitle={editTitle}
      isProcessing={isProcessing}
      isArchivedList={isArchivedList}
      onSelect={(id) => {
        onSelectConversation(id);
        onCloseSidebar?.();
      }}
      onStartRename={handleStartRename}
      onCancelRename={handleCancelRename}
      onEditTitleChange={setEditTitle}
      onSubmitRename={handleSubmitRename}
      onArchive={handleArchive}
      onStartDelete={handleStartDelete}
      onCancelDelete={() => setDeletingId(null)}
      onConfirmDelete={handleConfirmDelete}
    />
  );

  return (
    <div
      role="region"
      aria-label="Historique des discussions"
      className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Discussions
        </span>
        <button
          type="button"
          onClick={onNewConversation}
          aria-label="Créer une nouvelle discussion"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle</span>
        </button>
      </div>

      {/* Discussions actives */}
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {activeConversations.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            Aucune discussion active
          </div>
        ) : (
          activeConversations.map((c) => renderItem(c, false))
        )}
      </div>

      {/* Section discussions archivées repliable */}
      {archivedConversations.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsArchivedOpen((v) => !v)}
            aria-expanded={isArchivedOpen}
            aria-label={`Discussions archivées (${archivedConversations.length})`}
            className="w-full flex items-center justify-between py-1 px-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer font-medium"
          >
            <div className="flex items-center gap-1.5">
              {isArchivedOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Discussions archivées</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              {archivedConversations.length}
            </span>
          </button>

          {isArchivedOpen && (
            <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
              {archivedConversations.map((c) => renderItem(c, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
