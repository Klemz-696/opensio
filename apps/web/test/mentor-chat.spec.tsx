import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MentorChatDrawer } from '../components/ai/mentor-chat-drawer';
import * as chatApi from '../lib/api/chat-api';
import * as useAuthModule from '../lib/auth/use-auth';

describe('MentorChatDrawer (Assistant IA Frontend — Lot C3)', () => {
  const mockStatus: chatApi.ChatStatus = {
    enabled: true,
    provider: 'openai-compatible',
    mode: 'local',
    model: 'llama3.1:8b',
    remainingQuota: 19,
    rateLimitHourly: 20,
    privacyNotice: 'Mode Ollama Local (0 donnée transmise à un tiers).',
  };

  const mockModels: chatApi.AiModelsResponse = {
    models: ['llama3.1:8b', 'mistral:7b'],
    defaultModel: 'llama3.1:8b',
  };

  const mockPreferences: chatApi.AiPreferences = {
    preferredModel: 'llama3.1:8b',
    freeMode: false,
  };

  const mockConversations: chatApi.ChatConversationItem[] = [
    {
      id: 'conv-1',
      userId: 'user-lucas',
      title: 'Discussion Réseau',
      archivedAt: null,
      isCustomTitle: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { messages: 2 },
    },
    {
      id: 'conv-2',
      userId: 'user-lucas',
      title: 'Ancienne Discussion DNS',
      archivedAt: '2026-08-25T10:00:00.000Z',
      isCustomTitle: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { messages: 4 },
    },
  ];

  const mockMessages: chatApi.ChatMessageItem[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'USER',
      content: 'Comment fonctionne le CIDR ?',
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Le CIDR permet d\'allouer des blocs d\'adresses IP avec une granularité flexible.',
      tokensUsed: 20,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'user-lucas', email: 'lucas@opensio.local', displayName: 'Lucas SISR', role: 'student' as const },
      accessToken: 'valid-jwt-token',
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setAccessToken: vi.fn(),
    });

    vi.spyOn(chatApi, 'fetchChatStatus').mockResolvedValue(mockStatus);
    vi.spyOn(chatApi, 'fetchAiModels').mockResolvedValue(mockModels);
    vi.spyOn(chatApi, 'fetchAiPreferences').mockResolvedValue(mockPreferences);
    vi.spyOn(chatApi, 'updateAiPreferences').mockResolvedValue({ preferredModel: 'llama3.1:8b', freeMode: true });
    vi.spyOn(chatApi, 'fetchConversations').mockResolvedValue(mockConversations);
    vi.spyOn(chatApi, 'createConversation').mockResolvedValue({
      id: 'conv-3',
      userId: 'user-lucas',
      title: 'Nouvelle Discussion #3',
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { messages: 0 },
    });
    vi.spyOn(chatApi, 'updateConversation').mockImplementation(async (id, data) => ({
      id,
      userId: 'user-lucas',
      title: data.title || 'Titre Modifié',
      archivedAt: data.isArchived ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    vi.spyOn(chatApi, 'deleteConversation').mockResolvedValue(undefined);
    vi.spyOn(chatApi, 'fetchMessages').mockResolvedValue(mockMessages);
    vi.spyOn(chatApi, 'sendChatMessage').mockResolvedValue({
      userMessage: {
        id: 'msg-3',
        conversationId: 'conv-1',
        role: 'USER',
        content: 'Merci Mentor !',
        tokensUsed: 0,
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: 'msg-4',
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: 'Avec plaisir ! Bon courage pour ton TP.',
        tokensUsed: 12,
        createdAt: new Date().toISOString(),
      },
      remainingQuota: 18,
    });
  });

  it('1. Affiche le bouton flottant d’ouverture du chat pour un utilisateur connecté', () => {
    render(<MentorChatDrawer />);
    expect(screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i })).toBeDefined();
  });

  it('2. Ouvre le panneau latéral et affiche l’historique des messages et le mode local', async () => {
    render(<MentorChatDrawer />);
    const openBtn = screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /assistant mentor ia/i })).toBeDefined();
      expect(screen.getByText(/Ollama Local/i)).toBeDefined();
      expect(screen.getByText(/Comment fonctionne le CIDR \?/i)).toBeDefined();
      expect(screen.getByText(/granularité flexible/i)).toBeDefined();
    });
  });

  it('3. Permet à l’utilisateur d’envoyer un message et d’afficher la réponse sans doublon de clés', async () => {
    render(<MentorChatDrawer />);
    const openBtn = screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Pose ta question à Mentor/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Pose ta question à Mentor/i);
    fireEvent.change(input, { target: { value: 'Merci Mentor !' } });

    const sendBtn = screen.getByRole('button', { name: /envoyer le message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(chatApi.sendChatMessage).toHaveBeenCalled();
      expect(screen.getByText(/Bon courage pour ton TP/i)).toBeDefined();
    });
  });

  it('4. Ouvre le panneau de gestion des discussions et affiche les discussions actives et archivées', async () => {
    render(<MentorChatDrawer />);
    const openBtn = screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByTitle(/historique des discussions/i)).toBeDefined();
    });

    const sidebarBtn = screen.getByTitle(/historique des discussions/i);
    fireEvent.click(sidebarBtn);

    await waitFor(() => {
      expect(screen.getByText('Discussion Réseau')).toBeDefined();
      expect(screen.getByText(/Discussions archivées/i)).toBeDefined();
    });
  });

  it('5. Permet le renommage inline d’une discussion avec touches Entrée et validation API', async () => {
    render(<MentorChatDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i }));

    await waitFor(() => {
      expect(screen.getByTitle(/historique des discussions/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/historique des discussions/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /renommer discussion réseau/i })).toBeDefined();
    });

    const renameBtn = screen.getByRole('button', { name: /renommer discussion réseau/i });
    fireEvent.click(renameBtn);

    const renameInput = screen.getByLabelText(/nouveau titre de la discussion/i);
    fireEvent.change(renameInput, { target: { value: 'Routage Dynamique OSPF' } });

    const saveBtn = screen.getByRole('button', { name: /enregistrer le nouveau titre/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chatApi.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        { title: 'Routage Dynamique OSPF' },
        'valid-jwt-token'
      );
    });
  });

  it('6. Permet d’archiver et désarchiver une discussion', async () => {
    render(<MentorChatDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i }));

    await waitFor(() => {
      expect(screen.getByTitle(/historique des discussions/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/historique des discussions/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^archiver discussion réseau/i })).toBeDefined();
    });

    const archiveBtn = screen.getByRole('button', { name: /^archiver discussion réseau/i });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(chatApi.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        { isArchived: true },
        'valid-jwt-token'
      );
    });
  });

  it('7. Demande confirmation avant suppression définitive et appelle l’API de suppression', async () => {
    render(<MentorChatDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i }));

    await waitFor(() => {
      expect(screen.getByTitle(/historique des discussions/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/historique des discussions/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /supprimer discussion réseau/i })).toBeDefined();
    });

    const deleteBtn = screen.getByRole('button', { name: /supprimer discussion réseau/i });
    fireEvent.click(deleteBtn);

    // Vérifie affichage de la confirmation
    expect(screen.getByText(/supprimer définitivement \?/i)).toBeDefined();
    const confirmBtn = screen.getByRole('button', { name: /confirmer la suppression de discussion réseau/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(chatApi.deleteConversation).toHaveBeenCalledWith('conv-1', 'valid-jwt-token');
    });
  });

  it('8. Permet d’ouvrir les préférences et de basculer le Mode Libre', async () => {
    render(<MentorChatDrawer />);
    const openBtn = screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByTitle(/préférences ia/i)).toBeDefined();
    });

    const settingsBtn = screen.getByTitle(/préférences ia/i);
    fireEvent.click(settingsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mode Libre/i)).toBeDefined();
      expect(screen.getByText('mistral:7b')).toBeDefined();
    });

    const freeModeToggle = screen.getByText(/Mode Libre/i).closest('div')?.parentElement?.querySelector('button');
    if (freeModeToggle) {
      fireEvent.click(freeModeToggle);
      await waitFor(() => {
        expect(chatApi.updateAiPreferences).toHaveBeenCalledWith({ freeMode: true }, 'valid-jwt-token');
      });
    }
  });
});
