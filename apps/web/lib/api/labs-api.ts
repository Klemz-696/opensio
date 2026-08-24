export interface LabEditableFile {
  path: string;
  description?: string;
  initialContent?: string;
}

export interface LabHintSummary {
  index: number;
  costPercent: number;
}

export interface LabUnlockedHint {
  index: number;
  costPercent: number;
  text: string;
}

export interface LabCheckSummary {
  id: string;
  required: boolean;
  points: number;
  description?: string;
}

export interface LabPublicDetail {
  id: string;
  slug: string;
  title: string;
  level: string;
  maxScore: number;
  estimatedMinutes: number;
  context: string;
  objectives: string[];
  prerequisites: string[];
  topology: string | null;
  editableFiles: LabEditableFile[];
  hintsCount: number;
  hintsSummary: LabHintSummary[];
  scoring: {
    floorPercent: number;
  };
  checksSummary: LabCheckSummary[];
  activeSessionId?: string | null;
  bestScore?: number | null;
  isCompleted?: boolean;
}

export interface LabSession {
  id: string;
  labId: string;
  labSlug: string;
  labTitle: string;
  labLevel: string;
  userId: string;
  status: 'running' | 'passed' | 'failed' | 'expired' | 'cleaned';
  score: number | null;
  hintsUsed: number;
  totalHints: number;
  unlockedHints: LabUnlockedHint[];
  files: Array<{ path: string; content: string }>;
  lastResult: {
    passed: boolean;
    score: number;
    checks: Array<{
      id: string;
      passed: boolean;
      points: number;
      message: string;
    }>;
  } | null;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface LabVerdict {
  passed: boolean;
  score: number;
  status: 'running' | 'passed' | 'failed' | 'expired' | 'cleaned';
  checks: Array<{
    id: string;
    passed: boolean;
    points: number;
    message: string;
  }>;
}

export interface LabHintResponse {
  hintIndex: number;
  costPercent: number;
  text: string;
  hintsUsed: number;
  totalHints: number;
}

const API_BASE = '/api/v1';

export async function fetchLab(slug: string, token?: string | null): Promise<LabPublicDetail> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/labs/${encodeURIComponent(slug)}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Erreur réseau' }));
    throw new Error(errorData.detail || errorData.message || 'Impossible de récupérer le lab.');
  }
  return res.json();
}

export async function startLabSession(slug: string, token: string): Promise<LabSession> {
  const res = await fetch(`${API_BASE}/labs/${encodeURIComponent(slug)}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Erreur lors du démarrage' }));
    throw new Error(errorData.detail || errorData.message || 'Échec du démarrage de session.');
  }
  return res.json();
}

export async function fetchLabSession(
  slug: string,
  sessionId: string,
  token: string
): Promise<LabSession> {
  const res = await fetch(
    `${API_BASE}/labs/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Session introuvable' }));
    throw new Error(errorData.detail || errorData.message || 'Impossible de récupérer la session.');
  }
  return res.json();
}

export async function saveLabFiles(
  slug: string,
  sessionId: string,
  files: Array<{ path: string; content: string }>,
  token: string
): Promise<{ success: boolean; savedFiles: Array<{ path: string; size: number }> }> {
  const res = await fetch(
    `${API_BASE}/labs/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/files`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ files }),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Échec de la sauvegarde' }));
    throw new Error(errorData.detail || errorData.message || 'Erreur lors de la sauvegarde.');
  }
  return res.json();
}

export async function validateLabSession(
  slug: string,
  sessionId: string,
  token: string,
  files?: Array<{ path: string; content: string }>
): Promise<LabVerdict> {
  const res = await fetch(
    `${API_BASE}/labs/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/validate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(files ? { files } : {}),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Échec de la validation' }));
    throw new Error(errorData.detail || errorData.message || 'Erreur lors de la validation.');
  }
  return res.json();
}

export async function consumeLabHint(
  slug: string,
  sessionId: string,
  token: string
): Promise<LabHintResponse> {
  const res = await fetch(
    `${API_BASE}/labs/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/hint`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Échec déblocage indice' }));
    throw new Error(errorData.detail || errorData.message || 'Impossible de débloquer l’indice.');
  }
  return res.json();
}

export async function stopLabSession(
  slug: string,
  sessionId: string,
  token: string
): Promise<LabSession> {
  const res = await fetch(
    `${API_BASE}/labs/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/stop`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Échec arrêt session' }));
    throw new Error(errorData.detail || errorData.message || 'Impossible d’arrêter la session.');
  }
  return res.json();
}
