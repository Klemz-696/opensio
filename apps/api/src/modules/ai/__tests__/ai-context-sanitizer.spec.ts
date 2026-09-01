import { describe, it, expect, vi } from 'vitest';
import { AiContextSanitizerService } from '../services/ai-context-sanitizer.service';
import type { PrismaService } from '../../../prisma/prisma.service';

describe('AiContextSanitizerService (Contextes et Pédagogie — Lot C3)', () => {
  it('1. Construit un prompt système strict sans aucune solution de lab', async () => {
    const mockPrisma = {
      lab: {
        findUnique: vi.fn().mockResolvedValue({
          slug: 'lab-plan-adressage',
          title: 'Plan d’adressage IPv4',
          level: 'LEVEL_2_FILES',
          estimatedMinutes: 30,
        }),
      },
    };

    const sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
    const result = await sanitizer.buildSanitizedContext({ labSlug: 'lab-plan-adressage' });

    expect(result.systemPrompt).toContain('Tu es « Mentor »');
    expect(result.systemPrompt).toContain('Plan d’adressage IPv4');
    expect(result.systemPrompt).toContain('Tu ne donnes JAMAIS la réponse exacte');
    expect(result.isEvaluated).toBe(true);

    // SÉCURITÉ CRITIQUE : aucun validateur ou réponse ne doit figurer dans le prompt
    expect(result.systemPrompt).not.toContain('validate.mjs');
    expect(result.systemPrompt).not.toContain('correctChoiceIds');
  });

  it('2. Injecte le titre et les objectifs de la leçon UNIQUEMENT (jamais le cours complet)', async () => {
    const mockPrisma = {
      lesson: {
        findUnique: vi.fn().mockResolvedValue({
          slug: 'routage-statique',
          title: 'Routage Statique et Passerelles',
          objectives: [
            'Comprendre le rôle d’une table de routage',
            'Configurer une passerelle par défaut sous Linux',
          ],
          module: {
            slug: 'administration-reseau',
            title: 'Administration Réseau Avancée',
          },
        }),
      },
    };

    const sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
    const result = await sanitizer.buildSanitizedContext({ lessonSlug: 'routage-statique' });

    expect(result.isEvaluated).toBe(false);
    expect(result.systemPrompt).toContain('Routage Statique et Passerelles');
    expect(result.systemPrompt).toContain('Administration Réseau Avancée');
    expect(result.systemPrompt).toContain('Comprendre le rôle d’une table de routage');
    expect(result.systemPrompt).toContain('Configurer une passerelle par défaut sous Linux');
    expect(result.contextHeader).toBe('Leçon : Routage Statique et Passerelles');

    // Ne contient aucun contenu markdown complet
    expect(result.systemPrompt).not.toContain('# Chapitre 1');
  });

  it('3. Construit un prompt de coaching pédagogique suite à une erreur sur un quiz', async () => {
    const mockPrisma = {
      quiz: {
        findUnique: vi.fn().mockResolvedValue({
          slug: 'quiz-cidr',
          title: 'Quiz Adressage et Masques CIDR',
        }),
      },
    };

    const sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
    const result = await sanitizer.buildSanitizedContext({
      pageType: 'quiz-coaching',
      quizSlug: 'quiz-cidr',
      questionPrompt: 'Quel est le masque de sous-réseau correspondant à un préfixe /26 ?',
      userAnswer: '255.255.255.128',
      choices: ['255.255.255.0', '255.255.255.128', '255.255.255.192', '255.255.255.224'],
    });

    expect(result.isEvaluated).toBe(false);
    expect(result.systemPrompt).toContain('Coaching pédagogique suite à une réponse incorrecte');
    expect(result.systemPrompt).toContain('Quiz Adressage et Masques CIDR');
    expect(result.systemPrompt).toContain('Quel est le masque de sous-réseau correspondant à un préfixe /26 ?');
    expect(result.systemPrompt).toContain('255.255.255.128');
    expect(result.systemPrompt).toContain('255.255.255.192');
    expect(result.contextHeader).toContain('Coaching Quiz : Quiz Adressage et Masques CIDR');
  });

  it('4. Construit un prompt général par défaut quand aucun contexte de page n’est fourni', async () => {
    const mockPrisma = {};
    const sanitizer = new AiContextSanitizerService(mockPrisma as unknown as PrismaService);
    const result = await sanitizer.buildSanitizedContext();

    expect(result.isEvaluated).toBe(false);
    expect(result.systemPrompt).toContain('Tu es « Mentor »');
    expect(result.contextHeader).toBeUndefined();
  });
});
