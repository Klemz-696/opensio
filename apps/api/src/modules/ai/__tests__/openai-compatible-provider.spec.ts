import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible-provider.service';

describe('OpenAiCompatibleProvider (Ollama local / API distante D-16)', () => {
  let provider: OpenAiCompatibleProvider;

  beforeEach(() => {
    process.env.AI_BASE_URL = 'http://localhost:11434/v1';
    process.env.AI_MODEL = 'llama3.1:8b';
    provider = new OpenAiCompatibleProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('génère une réponse structurée au format ChatResult en cas de succès', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Pour calculer le masque, regarde le nombre d'hôtes nécessaires.",
              },
            },
          ],
          usage: { total_tokens: 42 },
        }),
      })
    );

    const result = await provider.chat([
      { role: 'user', content: 'Comment calculer mon masque ?' },
    ]);

    expect(result.content).toContain('Pour calculer le masque');
    expect(result.tokensUsed).toBe(42);
    expect(result.provider).toBe('openai-compatible');
    expect(result.model).toBe('llama3.1:8b');
  });

  it('bascule vers une réponse dégradée sans planter si Ollama est hors ligne', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    );

    const result = await provider.chat([
      { role: 'user', content: 'Aide-moi s\'il te plaît' },
    ]);

    expect(result.content).toContain('[Mentor OpenSIO — Mode Dégradé]');
    expect(result.tokensUsed).toBe(0);
  });
});
