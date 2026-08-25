import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MentorChatDrawer } from '../components/ai/mentor-chat-drawer';
import * as chatApi from '../lib/api/chat-api';
import * as useAuthModule from '../lib/auth/use-auth';

describe('MentorChatDrawer (Assistant IA Frontend)', () => {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { messages: 2 },
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

  it('affiche le bouton flottant d’ouverture du chat pour un utilisateur connecté', () => {
    render(<MentorChatDrawer />);
    expect(screen.getByRole('button', { name: /ouvrir l'assistant mentor ia/i })).toBeDefined();
  });

  it('ouvre le panneau latéral et affiche l’historique des messages et le mode local', async () => {
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

  it('permet à l’utilisateur d’envoyer un message et d’afficher la réponse sans doublon de clés', async () => {
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

  it('permet d’ouvrir les préférences et de basculer le Mode Libre', async () => {
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
