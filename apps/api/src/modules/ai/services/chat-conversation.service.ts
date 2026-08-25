import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateConversationDto } from '../dto/create-conversation.dto';
import type { UpdateConversationDto } from '../dto/update-conversation.dto';
import type { ResolvedContextData } from './ai-context-sanitizer.service';

@Injectable()
export class ChatConversationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Liste les conversations d'un utilisateur avec filtrage actif/archivé.
   */
  async listConversations(userId: string, status: 'active' | 'archived' | 'all' = 'active') {
    const whereClause: {
      userId: string;
      archivedAt?: null | { not: null };
    } = { userId };

    if (status === 'active') {
      whereClause.archivedAt = null;
    } else if (status === 'archived') {
      whereClause.archivedAt = { not: null };
    }

    return this.prisma.chatConversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Crée une nouvelle conversation.
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
    resolvedContext: ResolvedContextData
  ) {
    const title =
      dto.title ||
      (resolvedContext.title
        ? `${resolvedContext.pageType.toUpperCase()} : ${resolvedContext.title}`
        : 'Discussion générale');

    return this.prisma.chatConversation.create({
      data: {
        userId,
        title,
        isCustomTitle: Boolean(dto.title),
        context: JSON.parse(JSON.stringify(resolvedContext)),
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
   * Met à jour une conversation (renommage manuel ou archivage/désarchivage).
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    dto: UpdateConversationDto
  ) {
    const conversation = await this.getConversation(conversationId, userId);

    const updateData: {
      title?: string;
      isCustomTitle?: boolean;
      archivedAt?: Date | null;
    } = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
      updateData.isCustomTitle = true;
    }

    if (dto.isArchived !== undefined) {
      updateData.archivedAt = dto.isArchived ? new Date() : null;
    }

    return this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: updateData,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Supprime définitivement une conversation.
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.getConversation(conversationId, userId);
    await this.prisma.chatConversation.delete({
      where: { id: conversation.id },
    });
    return { success: true };
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
}
