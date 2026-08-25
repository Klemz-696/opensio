export interface ChatStatus {
  enabled: boolean;
  provider: string;
  mode: 'local' | 'remote' | 'disabled';
  model: string;
  remainingQuota: number;
  rateLimitHourly: number;
  privacyNotice: string;
}

export interface PageContext {
  pageType?: string;
  pageSlug?: string;
  labSlug?: string;
  lessonSlug?: string;
  quizSlug?: string;
  moduleSlug?: string;
  moduleTitle?: string;
  title?: string;
  isEvaluated?: boolean;
  questionPrompt?: string;
  userAnswer?: string;
  choices?: string[];
}

export interface ChatConversationItem {
  id: string;
  userId: string;
  title: string;
  isCustomTitle?: boolean;
  archivedAt?: string | null;
  context?: PageContext;
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

export interface AiPreferences {
  preferredModel: string | null;
  freeMode: boolean;
}

export interface AiModelsResponse {
  models: string[];
  defaultModel: string;
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

export async function fetchAiModels(token: string): Promise<AiModelsResponse> {
  const res = await fetch(`${API_BASE}/chat/models`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return { models: ['llama3.1:8b'], defaultModel: 'llama3.1:8b' };
  }

  return res.json() as Promise<AiModelsResponse>;
}

export async function fetchAiPreferences(token: string): Promise<AiPreferences> {
  const res = await fetch(`${API_BASE}/chat/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return { preferredModel: null, freeMode: false };
  }

  return res.json() as Promise<AiPreferences>;
}

export async function updateAiPreferences(
  prefs: Partial<AiPreferences>,
  token: string
): Promise<AiPreferences> {
  const res = await fetch(`${API_BASE}/chat/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(prefs),
  });

  if (!res.ok) {
    throw new Error('Impossible de mettre à jour les préférences IA.');
  }

  return res.json() as Promise<AiPreferences>;
}

export async function fetchConversations(
  token: string,
  status: 'active' | 'archived' | 'all' = 'active'
): Promise<ChatConversationItem[]> {
  const queryParam = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/chat/conversations${queryParam}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Impossible de charger les conversations.');
  }

  return res.json() as Promise<ChatConversationItem[]>;
}

export async function createConversation(
  token: string,
  params?: { title?: string; context?: PageContext }
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

export async function updateConversation(
  conversationId: string,
  data: { title?: string; isArchived?: boolean },
  token: string
): Promise<ChatConversationItem> {
  const res = await fetch(`${API_BASE}/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || 'Impossible de mettre à jour la discussion.');
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
  context?: PageContext
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
    throw new Error(err.message || "Échec de l'envoi du message.");
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
