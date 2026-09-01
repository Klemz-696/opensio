import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  AI_PROVIDER_TOKEN,
  type AiProvider,
  type ChatMessage as ProviderChatMessage,
} from '../interfaces/ai-provider.interface';
import { AiContextSanitizerService } from './ai-context-sanitizer.service';
import { AiSolutionFilterService } from './ai-solution-filter.service';
import { AiRateLimiterService } from './ai-rate-limiter.service';
import { ChatConversationService } from './chat-conversation.service';
import { generateAutoConversationTitle } from '../utils/conversation-namer.util';
import { ChatRole, Prisma } from '@prisma/client';
import type { CreateConversationDto } from '../dto/create-conversation.dto';
import type { UpdateConversationDto } from '../dto/update-conversation.dto';
import type { SendMessageDto } from '../dto/send-message.dto';
import type { ChatStatusResponse } from '../dto/chat-status-response.dto';
import type { UpdateAiPreferencesDto } from '../dto/update-preferences.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AiProvider,
    @Inject(AiContextSanitizerService) private readonly contextSanitizer: AiContextSanitizerService,
    @Inject(AiSolutionFilterService) private readonly solutionFilter: AiSolutionFilterService,
    @Inject(AiRateLimiterService) private readonly rateLimiter: AiRateLimiterService,
    @Inject(ChatConversationService) private readonly conversationService: ChatConversationService
  ) {}

  /**
   * Récupère l'état du service d'assistant IA et les préférences de l'utilisateur.
   */
  async getStatus(userId: string): Promise<ChatStatusResponse> {
    const isAiEnabled = process.env.AI_ENABLED !== 'false';
    const baseUrl = process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL || 'http://127.0.0.1:11434/v1';
    const apiKey = process.env.AI_API_KEY;
    const isLocal =
      !apiKey &&
      (baseUrl.includes('localhost') ||
        baseUrl.includes('127.0.0.1') ||
        baseUrl.includes('host.docker.internal'));

    let mode: 'local' | 'remote' | 'disabled' = 'disabled';
    if (isAiEnabled) {
      mode = isLocal ? 'local' : 'remote';
    }

    const remainingQuota = this.rateLimiter.getRemainingQuota(userId);
    const hourlyLimit = this.rateLimiter.getHourlyLimit();

    const privacyNotice =
      mode === 'local'
        ? 'Mode Ollama Local (0 donnée transmise à un tiers — confidentialité homelab totale conforme RGPD/D-16).'
        : mode === 'remote'
          ? "Mode API Distante activé : les échanges sont transmis de manière chiffrée au fournisseur d'IA configuré."
          : 'Assistant IA désactivé sur cette instance.';

    const pref = await this.getPreferences(userId);

    return {
      enabled: isAiEnabled,
      provider: this.aiProvider.name,
      mode,
      model: pref.preferredModel || process.env.AI_MODEL || 'llama3.1:8b',
      remainingQuota,
      rateLimitHourly: hourlyLimit,
      privacyNotice,
    };
  }

  /**
   * Récupère la liste des modèles installés / disponibles.
   */
  async getAvailableModels(): Promise<{ models: string[]; defaultModel: string }> {
    const defaultModel = process.env.AI_MODEL || 'llama3.1:8b';
    const models = this.aiProvider.listModels
      ? await this.aiProvider.listModels()
      : [defaultModel];
    return { models, defaultModel };
  }

  /**
   * Récupère les préférences IA d'un utilisateur.
   */
  async getPreferences(userId: string) {
    const pref = await this.prisma.userAiPreference.findUnique({
      where: { userId },
    });

    return {
      preferredModel: pref?.preferredModel || null,
      freeMode: pref?.freeMode || false,
    };
  }

  /**
   * Met à jour les préférences IA d'un utilisateur et journalise l'activation du mode libre.
   */
  async updatePreferences(userId: string, dto: UpdateAiPreferencesDto) {
    const existing = await this.prisma.userAiPreference.findUnique({
      where: { userId },
    });

    const isTogglingFreeMode =
      dto.freeMode !== undefined && dto.freeMode !== (existing?.freeMode ?? false);

    const updated = await this.prisma.userAiPreference.upsert({
      where: { userId },
      create: {
        userId,
        preferredModel: dto.preferredModel !== undefined ? dto.preferredModel : null,
        freeMode: dto.freeMode ?? false,
      },
      update: {
        preferredModel: dto.preferredModel !== undefined ? dto.preferredModel : undefined,
        freeMode: dto.freeMode !== undefined ? dto.freeMode : undefined,
      },
    });

    if (isTogglingFreeMode) {
      await this.auditService.logEvent({
        actorId: userId,
        action: 'AI_FREE_MODE_TOGGLED',
        targetType: 'user_ai_preferences',
        targetId: updated.id,
        metadata: {
          freeMode: updated.freeMode,
          previousValue: existing?.freeMode ?? false,
        },
      });
    }

    return {
      preferredModel: updated.preferredModel,
      freeMode: updated.freeMode,
    };
  }

  /**
   * Liste les conversations d'un utilisateur avec filtrage optionnel (active/archived/all).
   */
  async listConversations(userId: string, status: 'active' | 'archived' | 'all' = 'active') {
    return this.conversationService.listConversations(userId, status);
  }

  /**
   * Crée une nouvelle conversation avec résolution de contexte côté serveur.
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    const { resolvedContext } = await this.contextSanitizer.buildSanitizedContext(dto.context);
    return this.conversationService.createConversation(userId, dto, resolvedContext);
  }

  /**
   * Met à jour une conversation (renommage ou archivage).
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    dto: UpdateConversationDto
  ) {
    return this.conversationService.updateConversation(conversationId, userId, dto);
  }

  /**
   * Récupère une conversation spécifique avec contrôle d'appartenance strict.
   */
  async getConversation(conversationId: string, userId: string) {
    return this.conversationService.getConversation(conversationId, userId);
  }

  /**
   * Récupère les messages d'une conversation (les 20 derniers).
   */
  async getMessages(conversationId: string, userId: string) {
    return this.conversationService.getMessages(conversationId, userId);
  }

  /**
   * Envoie un message dans la conversation, vérifie la tentative de contournement,
   * applique les préférences étudiant, auto-renomme si nécessaire et filtre la réponse.
   */
  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conversation = await this.getConversation(conversationId, userId);

    // 1. Vérification du quota de requêtes (Rate limiting)
    this.rateLimiter.checkAndRecord(userId);

    // 2. Charger les préférences de l'utilisateur
    const userPref = await this.getPreferences(userId);

    // 3. Résolution du contexte serveur
    const contextMeta = dto.context || (conversation.context as Record<string, string> | undefined);
    const sanitized = await this.contextSanitizer.buildSanitizedContext(
      contextMeta,
      userPref.freeMode
    );

    // Compter les messages existants pour le renommage automatique
    const existingMessagesCount = await this.prisma.chatMessage.count({
      where: { conversationId: conversation.id },
    });

    // 4. Enregistrer le message de l'utilisateur
    const userMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.USER,
        content: dto.content,
      },
    });

    // 5. Détection de tentative de contournement (asking for a lab solution in general chat)
    const knownLabs = await this.prisma.lab.findMany({
      select: { slug: true, title: true },
    });
    const circumventionCheck = this.solutionFilter.detectCircumvention(dto.content, knownLabs);

    let filteredContent: string;
    let tokensUsed = 0;
    let usedModel = userPref.preferredModel || process.env.AI_MODEL || 'llama3.1:8b';

    if (circumventionCheck.isCircumvention) {
      await this.auditService.logEvent({
        actorId: userId,
        action: 'AI_CIRCUMVENTION_ATTEMPT',
        targetType: 'chat_conversations',
        targetId: conversation.id,
        metadata: {
          querySnippet: dto.content.slice(0, 200),
          matchedLabSlug: circumventionCheck.matchedLabSlug,
          reason: circumventionCheck.reason,
        },
      });

      filteredContent = this.solutionFilter.getRefusalMessage(
        circumventionCheck.matchedLabSlug || sanitized.resolvedContext.labSlug
      );
    } else {
      // 6. Charger l'historique récent (20 derniers messages)
      const history = await this.prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const providerMessages: ProviderChatMessage[] = [
        { role: 'system', content: sanitized.systemPrompt },
        ...history.map((m) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ];

      // 7. Appel au fournisseur IA avec le modèle préféré
      const chatResult = await this.aiProvider.chat(providerMessages, {
        model: userPref.preferredModel || undefined,
        context: sanitized.resolvedContext,
      });

      tokensUsed = chatResult.tokensUsed;
      usedModel = chatResult.model;

      // 8. Filtrage post-traitement de sécurité anti-solution (RM-11)
      const filterRes = this.solutionFilter.filterResponse(chatResult.content, {
        isEvaluated: sanitized.isEvaluated,
        labSlug: sanitized.resolvedContext.labSlug,
      });
      filteredContent = filterRes.content;
    }

    // 9. Enregistrer la réponse de l'assistant en base
    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.ASSISTANT,
        content: filteredContent,
        tokensUsed,
      },
    });

    // 10. Mettre à jour l'horodatage, le contexte résolu et potentiellement le titre auto
    const convUpdateData: Prisma.ChatConversationUpdateInput = {
      updatedAt: new Date(),
      context: JSON.parse(JSON.stringify(sanitized.resolvedContext)) as Prisma.InputJsonValue,
    };

    if (!conversation.isCustomTitle && existingMessagesCount === 0) {
      convUpdateData.title = generateAutoConversationTitle(dto.content);
    }

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: convUpdateData,
    });

    // 11. Journalisation dans l'audit (§28 / RM-12)
    await this.auditService.logEvent({
      actorId: userId,
      action: 'CHAT_MESSAGE_SENT',
      targetType: 'chat_conversations',
      targetId: conversation.id,
      metadata: {
        tokensUsed,
        provider: this.aiProvider.name,
        model: usedModel,
        isEvaluated: sanitized.isEvaluated,
        freeModeEffective: !sanitized.isEvaluated && userPref.freeMode,
        labSlug: sanitized.resolvedContext.labSlug,
      },
    });

    const remainingQuota = this.rateLimiter.getRemainingQuota(userId);

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      remainingQuota,
    };
  }

  /**
   * Supprime une conversation.
   */
  async deleteConversation(conversationId: string, userId: string) {
    return this.conversationService.deleteConversation(conversationId, userId);
  }
}
