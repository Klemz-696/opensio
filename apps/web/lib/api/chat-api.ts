export interface ChatStatus {
  enabled: boolean;
  provider: string;
  mode: 'local' | 'remote' | 'disabled';
  model: string;
  remainingQuota: number;
  rateLimitHourly: number;
  privacyNotice: string;
}

export interface ChatConversationItem {
  id: string;
  userId: string;
  title: string;
  context?: { labSlug?: string; lessonSlug?: string };
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed: number;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessageItem;
  assistantMessage: ChatMessageItem;
  remainingQuota: number;
}

const API_BASE = '/api/v1';

export async function fetchChatStatus(token: string): Promise<ChatStatus> {
  const res = await fetch(`${API_BASE}/chat/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || 'Impossible de récupérer le statut IA.');
  }

  return res.json() as Promise<ChatStatus>;
}

export async function fetchConversations(token: string): Promise<ChatConversationItem[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Impossible de charger les conversations.');
  }

  return res.json() as Promise<ChatConversationItem[]>;
}

export async function createConversation(
  token: string,
  params?: { title?: string; context?: { labSlug?: string; lessonSlug?: string } }
): Promise<ChatConversationItem> {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params || {}),
  });

  if (!res.ok) {
    throw new Error('Impossible de créer la discussion.');
  }

  return res.json() as Promise<ChatConversationItem>;
}

export async function fetchMessages(
  conversationId: string,
  token: string
): Promise<ChatMessageItem[]> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Impossible de charger les messages.');
  }

  return res.json() as Promise<ChatMessageItem[]>;
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
  token: string,
  context?: { labSlug?: string; lessonSlug?: string }
): Promise<SendMessageResponse> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, context }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Échec de l\'envoi du message.');
  }

  return res.json() as Promise<SendMessageResponse>;
}

export async function deleteConversation(conversationId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Impossible de supprimer la discussion.');
  }
}
