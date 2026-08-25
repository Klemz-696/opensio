import { describe, it, expect, vi } from 'vitest';
import { AiContextSanitizerService } from '../services/ai-context-sanitizer.service';
import type { PrismaService } from '../../../prisma/prisma.service';

describe('AiContextSanitizerService (Zéro-Fuite de Contexte)', () => {
  it('construit un prompt système strict sans aucune solution de lab', async () => {
    const mockPrisma = {
      lab: {
        findUnique: vi.fn().mockResolvedValue({
          slug: 'lab-plan-adressage',
          title: 'Plan d’adressage IPv4',
          level: 'LEVEL_2_FILES',
          estimatedMinutes: 30,
        }),
      },
      lesson: {
        findUnique: vi.fn(),
      },
    };

    const sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
    const result = await sanitizer.buildSanitizedContext({ labSlug: 'lab-plan-adressage' });

    expect(result.systemPrompt).toContain('Tu es « Mentor »');
    expect(result.systemPrompt).toContain('Plan d’adressage IPv4');
    expect(result.systemPrompt).toContain('Tu ne donnes JAMAIS la réponse exacte');

    // SÉCURITÉ CRITIQUE : aucun validateur ou réponse ne doit figurer dans le prompt
    expect(result.systemPrompt).not.toContain('validate.mjs');
    expect(result.systemPrompt).not.toContain('correctChoiceIds');
    expect(result.systemPrompt).not.toContain('192.168.1.0/27,192.168.1.32/28');
  });
});
