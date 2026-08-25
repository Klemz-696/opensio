import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ContextResolutionInput {
  pageType?: string;
  pageSlug?: string;
  labSlug?: string;
  lessonSlug?: string;
  quizSlug?: string;
  moduleSlug?: string;
}

export interface ResolvedContextData {
  pageType: string;
  pageSlug?: string;
  title?: string;
  isEvaluated: boolean;
  labSlug?: string;
  lessonSlug?: string;
  quizSlug?: string;
  moduleSlug?: string;
}

export interface SanitizedAiContext {
  systemPrompt: string;
  contextHeader?: string;
  isEvaluated: boolean;
  resolvedContext: ResolvedContextData;
}

@Injectable()
export class AiContextSanitizerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Résout l'entité côté serveur et construit la consigne système adaptée.
   * En contexte évalué (lab / quiz), les règles socratiques sont strictes et le mode libre est ignoré.
   */
  async buildSanitizedContext(
    input?: ContextResolutionInput,
    freeMode = false
  ): Promise<SanitizedAiContext> {
    const resolved = await this.resolveContext(input);

    let systemPrompt = '';
    let contextHeader = '';

    if (resolved.isEvaluated) {
      // 1. CONTEXTE ÉVALUÉ (Lab / Quiz) — Socratique Strict (Mode libre verrouillé)
      systemPrompt = [
        'Tu es « Mentor », le tuteur pédagogique d\'OpenSIO pour les étudiants de BTS SIO SISR.',
        'ATTENTION : L\'étudiant est actuellement dans un atelier ou une évaluation notée.',
        '',
        'RÈGLES IMPÉRATIVES DE SÉCURITÉ PÉDAGOGIQUE (ZÉRO-FUITE / RM-11) :',
        '1. Tu expliques les concepts généraux et tu poses des questions d\'orientation socratique.',
        '2. Tu ne donnes JAMAIS la réponse exacte, ni le fichier de configuration complet, ni la solution attendue.',
        '3. Tu orientes l\'étudiant vers des commandes d\'investigation (ex: ip a, ss -tuln, systemctl status, journalctl).',
        '4. Si l\'étudiant te demande la solution, refuse poliment et propose-lui une piste méthodologique.',
        '5. Réponds en français de façon concise et encourageante.',
      ].join('\n');

      if (resolved.labSlug) {
        systemPrompt += `\n\nAtelier en cours : [Lab: ${resolved.title || resolved.labSlug} (${resolved.labSlug})]. Ne révèle aucun fichier de solution pour ce TP.`;
        contextHeader = `Lab : ${resolved.title || resolved.labSlug}`;
      } else if (resolved.quizSlug) {
        systemPrompt += `\n\nQuiz en cours : [Quiz: ${resolved.title || resolved.quizSlug}]. Ne donne jamais les bonnes réponses.`;
        contextHeader = `Quiz : ${resolved.title || resolved.quizSlug}`;
      }
    } else {
      // 2. CONTEXTE NON-ÉVALUÉ (Cours / Dashboard / Général) — Mentor Global
      if (freeMode) {
        systemPrompt = [
          'Tu es « Mentor », le tuteur pédagogique d\'OpenSIO pour les étudiants de BTS SIO SISR.',
          'MODE LIBRE ACTIVÉ (Hors évaluation) :',
          '1. Tu réponds directement et précisément aux questions de l\'étudiant avec des explications complètes.',
          '2. Tu peux fournir des exemples de configuration, du code, des scripts et des commandes détaillées pour illustrer ton propos.',
          '3. Reste rigoureux, pédagogique et axé sur les bonnes pratiques réseau, système et cybersécurité.',
          '4. Réponds en français de manière claire et bienveillante.',
        ].join('\n');
      } else {
        systemPrompt = [
          'Tu es « Mentor », le tuteur pédagogique d\'OpenSIO pour les étudiants de BTS SIO SISR.',
          '1. Tu guides l\'étudiant dans ses révisions, expliques les concepts théoriques et donnes des exemples généraux.',
          '2. Réponds en français de manière structurée, pédagogique et bienveillante.',
        ].join('\n');
      }

      if (resolved.lessonSlug) {
        systemPrompt += `\n\nCours de référence : [Leçon: ${resolved.title || resolved.lessonSlug}].`;
        contextHeader = `Leçon : ${resolved.title || resolved.lessonSlug}`;
      } else if (resolved.moduleSlug) {
        systemPrompt += `\n\nModule de référence : [Module: ${resolved.title || resolved.moduleSlug}].`;
        contextHeader = `Module : ${resolved.title || resolved.moduleSlug}`;
      }
    }

    return {
      systemPrompt,
      contextHeader: contextHeader || undefined,
      isEvaluated: resolved.isEvaluated,
      resolvedContext: resolved,
    };
  }

  /**
   * Résolution en base de données de l'entité référencée par le contexte.
   */
  private async resolveContext(input?: ContextResolutionInput): Promise<ResolvedContextData> {
    if (!input) {
      return { pageType: 'general', isEvaluated: false };
    }

    const pageType = input.pageType || (input.labSlug ? 'lab' : input.quizSlug ? 'quiz' : input.lessonSlug ? 'lesson' : input.moduleSlug ? 'module' : 'general');
    const slug = input.pageSlug || input.labSlug || input.quizSlug || input.lessonSlug || input.moduleSlug;

    if (pageType === 'lab' || input.labSlug) {
      const labSlug = input.labSlug || slug;
      if (labSlug) {
        const lab = await this.prisma.lab.findUnique({
          where: { slug: labSlug },
          select: { slug: true, title: true },
        });
        if (lab) {
          return {
            pageType: 'lab',
            pageSlug: lab.slug,
            labSlug: lab.slug,
            title: lab.title,
            isEvaluated: true,
          };
        }
      }
      return { pageType: 'lab', pageSlug: slug, labSlug: slug, isEvaluated: true };
    }

    if (pageType === 'quiz' || input.quizSlug) {
      const quizSlug = input.quizSlug || slug;
      if (quizSlug) {
        const quiz = await this.prisma.quiz.findUnique({
          where: { slug: quizSlug },
          select: { slug: true, title: true },
        });
        if (quiz) {
          return {
            pageType: 'quiz',
            pageSlug: quiz.slug,
            quizSlug: quiz.slug,
            title: quiz.title,
            isEvaluated: true,
          };
        }
      }
      return { pageType: 'quiz', pageSlug: slug, quizSlug: slug, isEvaluated: true };
    }

    if (pageType === 'lesson' || input.lessonSlug) {
      const lessonSlug = input.lessonSlug || slug;
      if (lessonSlug) {
        const lesson = await this.prisma.lesson.findUnique({
          where: { slug: lessonSlug },
          select: { slug: true, title: true },
        });
        if (lesson) {
          return {
            pageType: 'lesson',
            pageSlug: lesson.slug,
            lessonSlug: lesson.slug,
            title: lesson.title,
            isEvaluated: false,
          };
        }
      }
      return { pageType: 'lesson', pageSlug: slug, lessonSlug: slug, isEvaluated: false };
    }

    if (pageType === 'module' || input.moduleSlug) {
      const moduleSlug = input.moduleSlug || slug;
      if (moduleSlug) {
        const mod = await this.prisma.module.findUnique({
          where: { slug: moduleSlug },
          select: { slug: true, title: true },
        });
        if (mod) {
          return {
            pageType: 'module',
            pageSlug: mod.slug,
            moduleSlug: mod.slug,
            title: mod.title,
            isEvaluated: false,
          };
        }
      }
      return { pageType: 'module', pageSlug: slug, moduleSlug: slug, isEvaluated: false };
    }

    return { pageType: 'general', isEvaluated: false };
  }
}
