import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
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
import { ChatRole } from '@prisma/client';
import type { CreateConversationDto } from '../dto/create-conversation.dto';
import type { SendMessageDto } from '../dto/send-message.dto';
import type { ChatStatusResponse } from '../dto/chat-status-response.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AiProvider,
    @Inject(AiContextSanitizerService) private readonly contextSanitizer: AiContextSanitizerService,
    @Inject(AiSolutionFilterService) private readonly solutionFilter: AiSolutionFilterService,
    @Inject(AiRateLimiterService) private readonly rateLimiter: AiRateLimiterService
  ) {}

  /**
   * Récupère l'état du service d'assistant IA et le quota restant de l'utilisateur.
   */
  async getStatus(userId: string): Promise<ChatStatusResponse> {
    const isAiEnabled = process.env.AI_ENABLED !== 'false';
    const baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
    const apiKey = process.env.AI_API_KEY;
    const isLocal = !apiKey && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('host.docker.internal'));

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
          : "Assistant IA désactivé sur cette instance.";

    return {
      enabled: isAiEnabled,
      provider: this.aiProvider.name,
      mode,
      model: process.env.AI_MODEL || 'llama3.1:8b',
      remainingQuota,
      rateLimitHourly: hourlyLimit,
      privacyNotice,
    };
  }

  /**
   * Liste les conversations d'un utilisateur.
   */
  async listConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Crée une nouvelle conversation pour l'utilisateur.
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    const title = dto.title || (dto.context?.labSlug ? `Aide Lab : ${dto.context.labSlug}` : 'Nouvelle discussion');

    return this.prisma.chatConversation.create({
      data: {
        userId,
        title,
        context: dto.context ? JSON.parse(JSON.stringify(dto.context)) : undefined,
      },
    });
  }

  /**
   * Récupère une conversation spécifique avec contrôle d'appartenance strict.
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} introuvable.`);
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette conversation.");
    }

    return conversation;
  }

  /**
   * Récupère les messages d'une conversation (les 20 derniers).
   */
  async getMessages(conversationId: string, userId: string) {
    await this.getConversation(conversationId, userId);

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
  }

  /**
   * Envoie un message dans la conversation, appelle le modèle IA et filtre la réponse.
   */
  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conversation = await this.getConversation(conversationId, userId);

    // 1. Vérification du quota de requêtes (Rate limiting)
    this.rateLimiter.checkAndRecord(userId);

    // 2. Enregistrer le message de l'utilisateur
    const userMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.USER,
        content: dto.content,
      },
    });

    // 3. Charger l'historique récent (20 derniers messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // 4. Préparer le contexte pédagogique et la consigne système (ZÉRO-FUITE)
    const contextMeta = dto.context || (conversation.context as { labSlug?: string; lessonSlug?: string } | undefined);
    const { systemPrompt } = await this.contextSanitizer.buildSanitizedContext(contextMeta);

    const providerMessages: ProviderChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    // 5. Appel au fournisseur IA
    const chatResult = await this.aiProvider.chat(providerMessages, {
      context: contextMeta,
    });

    // 6. Filtrage post-traitement de sécurité anti-solution (RM-11)
    const { content: filteredContent } = this.solutionFilter.filterResponse(
      chatResult.content,
      contextMeta?.labSlug
    );

    // 7. Enregistrer la réponse de l'assistant en base
    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatRole.ASSISTANT,
        content: filteredContent,
        tokensUsed: chatResult.tokensUsed,
      },
    });

    // 8. Mettre à jour l'horodatage de la conversation
    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 9. Journalisation dans l'audit (§28 / RM-12)
    await this.auditService.logEvent({
      actorId: userId,
      action: 'CHAT_MESSAGE_SENT',
      targetType: 'chat_conversations',
      targetId: conversation.id,
      metadata: {
        tokensUsed: chatResult.tokensUsed,
        provider: chatResult.provider,
        model: chatResult.model,
        labSlug: contextMeta?.labSlug,
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
    const conversation = await this.getConversation(conversationId, userId);
    await this.prisma.chatConversation.delete({
      where: { id: conversation.id },
    });
    return { success: true };
  }
}
