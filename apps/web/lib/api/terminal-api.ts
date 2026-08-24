export interface TerminalStatus {
  active: boolean;
  sessionId: string;
  labSlug: string;
  prompt: string;
  banner: string;
}

export interface TerminalExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
}

const API_BASE = '/api/v1';

export async function fetchTerminalStatus(
  labSlug: string,
  sessionId: string,
  token: string
): Promise<TerminalStatus> {
  const res = await fetch(`${API_BASE}/labs/${labSlug}/sessions/${sessionId}/terminal`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || 'Impossible de charger le statut du terminal.');
  }

  return res.json() as Promise<TerminalStatus>;
}

export async function executeTerminalCommand(
  labSlug: string,
  sessionId: string,
  command: string,
  token: string
): Promise<TerminalExecutionResult> {
  const res = await fetch(`${API_BASE}/labs/${labSlug}/sessions/${sessionId}/terminal/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ command }),
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || 'Échec de l\'exécution de la commande.');
  }

  return res.json() as Promise<TerminalExecutionResult>;
}
