import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiContextSanitizerService } from '../services/ai-context-sanitizer.service';
import type { PrismaService } from '../../../prisma/prisma.service';

describe('AiContextSanitizerService — Mode Libre & Contexte Évalué', () => {
  let sanitizer: AiContextSanitizerService;
  let mockPrisma: {
    lab: { findUnique: ReturnType<typeof vi.fn> };
    quiz: { findUnique: ReturnType<typeof vi.fn> };
    lesson: { findUnique: ReturnType<typeof vi.fn> };
    module: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      lab: { findUnique: vi.fn() },
      quiz: { findUnique: vi.fn() },
      lesson: { findUnique: vi.fn() },
      module: { findUnique: vi.fn() },
    };

    sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
  });

  it('verrouille le mode libre et applique les règles socratiques strictes en contexte de lab évalué', async () => {
    mockPrisma.lab.findUnique.mockResolvedValue({
      slug: 'plan-adressage-pme',
      title: "Plan d'adressage d'une PME",
    });

    const result = await sanitizer.buildSanitizedContext(
      { pageType: 'lab', pageSlug: 'plan-adressage-pme' },
      true // L'étudiant a activé freeMode
    );

    expect(result.isEvaluated).toBe(true);
    expect(result.systemPrompt).toContain('ATTENTION : L\'étudiant est actuellement dans un atelier ou une évaluation notée.');
    expect(result.systemPrompt).toContain('ZÉRO-FUITE / RM-11');
    expect(result.systemPrompt).not.toContain('MODE LIBRE ACTIVÉ');
  });

  it('active les consignes du mode libre uniquement hors contexte évalué (cours / général)', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({
      slug: 'adressage-ipv4',
      title: 'Notions d’adressage IPv4',
    });

    const result = await sanitizer.buildSanitizedContext(
      { pageType: 'lesson', pageSlug: 'adressage-ipv4' },
      true // freeMode = true
    );

    expect(result.isEvaluated).toBe(false);
    expect(result.systemPrompt).toContain('MODE LIBRE ACTIVÉ (Hors évaluation)');
    expect(result.systemPrompt).toContain('Tu peux fournir des exemples de configuration, du code');
  });

  it('applique le ton pédagogique standard lorsque le mode libre est désactivé hors évaluation', async () => {
    const result = await sanitizer.buildSanitizedContext(
      { pageType: 'general' },
      false // freeMode = false
    );

    expect(result.isEvaluated).toBe(false);
    expect(result.systemPrompt).not.toContain('MODE LIBRE ACTIVÉ');
    expect(result.systemPrompt).toContain('pédagogique et bienveillante');
  });
});
