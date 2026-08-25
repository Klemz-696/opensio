import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible-provider.service';

describe('OpenAiCompatibleProvider — Gestion du Timeout & Chargement Modèle', () => {
  let provider: OpenAiCompatibleProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.AI_BASE_URL = 'http://127.0.0.1:11434/v1';
    process.env.AI_MODEL = 'llama3.1:8b';
    process.env.AI_TIMEOUT_MS = '100'; // 100ms pour les tests
    provider = new OpenAiCompatibleProvider();
  });

  it('renvoie un message distinct de chargement en RAM lors d’un AbortError / Timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    vi.spyOn(global, 'fetch').mockRejectedValue(abortError);

    const result = await provider.chat([{ role: 'user', content: 'Bonjour Mentor' }], {
      timeoutMs: 50,
    });

    expect(result.content).toContain('[Mentor OpenSIO — Modèle en chargement]');
    expect(result.content).toContain('en cours de chargement en mémoire vive');
    expect(result.tokensUsed).toBe(0);
  });

  it('renvoie le message de repli standard lors d’une erreur de connexion (ECONNREFUSED)', async () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:11434');
    vi.spyOn(global, 'fetch').mockRejectedValue(connError);

    const result = await provider.chat([{ role: 'user', content: 'Bonjour Mentor' }]);

    expect(result.content).toContain('[Mentor OpenSIO — Mode Dégradé]');
    expect(result.content).toContain('injoignable');
  });

  it('liste les modèles installés via /api/tags d’Ollama', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3.1:8b' }, { name: 'mistral:7b' }, { name: 'codellama:13b' }],
      }),
    } as unknown as Response);

    const models = await provider.listModels();
    expect(models).toEqual(['llama3.1:8b', 'mistral:7b', 'codellama:13b']);
  });
});
