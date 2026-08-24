import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SanitizedAiContext {
  systemPrompt: string;
  contextHeader?: string;
}

@Injectable()
export class AiContextSanitizerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Construit la consigne système stricte et le contexte pédagogique sécurisé (ZÉRO-FUITE).
   * Les validateurs, solutions et correctChoiceIds ne sont JAMAIS injectés.
   */
  async buildSanitizedContext(context?: {
    labSlug?: string;
    lessonSlug?: string;
  }): Promise<SanitizedAiContext> {
    let basePrompt = [
      'Tu es « Mentor », le tuteur pédagogique d\'OpenSIO pour les étudiants de BTS SIO option SISR (Systèmes et Réseaux).',
      '',
      'RÈGLES IMPÉRATIVES DE SÉCURITÉ PÉDAGOGIQUE :',
      '1. Tu expliques les concepts, tu guides la réflexion et tu poses des questions d\'orientation.',
      '2. Tu ne donnes JAMAIS la solution complète ou directe d\'un lab, d\'un quiz ou d\'un scénario en cours.',
      '3. Si l\'étudiant insiste pour obtenir la réponse toute faite ou le code de configuration complet, tu refuses courtoisement et tu lui proposes un indice méthodologique ou une commande de diagnostic (ex: ip a, ping, systemctl status).',
      '4. Tu restes strictement dans le périmètre des systèmes (Linux/Debian, Windows), des réseaux (adressage IPv4/IPv6, routage, DNS, DHCP, VLAN) et de la cybersécurité défensive.',
      '5. Tu rédiges tes réponses en français, de façon concise, encourageante et structurée avec des blocs de code pour illustrer la syntaxe générale sans donner la solution exacte du TP.',
    ].join('\n');

    let contextHeader = '';

    // Contexte sécurisé d'un atelier pratique (Lab)
    if (context?.labSlug) {
      const lab = await this.prisma.lab.findUnique({
        where: { slug: context.labSlug },
        select: {
          slug: true,
          title: true,
          level: true,
          estimatedMinutes: true,
        },
      });

      if (lab) {
        basePrompt += `\n\nContexte de l'atelier en cours : [Lab: ${lab.title} (Niveau: ${lab.level}, Slug: ${lab.slug})]. Rappel : Ne donne jamais les fichiers de configuration finals ni les réponses attendues pour cet atelier.`;
        contextHeader = `Lab : ${lab.title}`;
      }
    }

    // Contexte sécurisé d'une leçon
    if (context?.lessonSlug) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { slug: context.lessonSlug },
        select: {
          slug: true,
          title: true,
          difficulty: true,
          module: { select: { title: true } },
        },
      });

      if (lesson) {
        basePrompt += `\n\nContexte du cours en cours : [Leçon: ${lesson.title} - Module: ${lesson.module?.title || 'Général'}].`;
        contextHeader = `Leçon : ${lesson.title}`;
      }
    }

    return {
      systemPrompt: basePrompt,
      contextHeader: contextHeader || undefined,
    };
  }
}
