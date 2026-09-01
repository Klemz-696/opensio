import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './services/chat.service';
import { createConversationSchema, type CreateConversationDto } from './dto/create-conversation.dto';
import { updateConversationSchema, type UpdateConversationDto } from './dto/update-conversation.dto';
import { listConversationsQuerySchema, type ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { sendMessageSchema, type SendMessageDto } from './dto/send-message.dto';
import { updateAiPreferencesSchema, type UpdateAiPreferencesDto } from './dto/update-preferences.dto';

@Controller('chat')
@UseGuards(AuthGuard)
export class AiController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  /**
   * GET /api/v1/chat/status
   * Statut du service IA, quota restant et mention de confidentialité RGPD.
   */
  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getStatus(user.id);
  }

  /**
   * GET /api/v1/chat/models
   * Liste les modèles installés / disponibles sur le fournisseur IA.
   */
  @Get('models')
  async getModels() {
    return this.chatService.getAvailableModels();
  }

  /**
   * GET /api/v1/chat/preferences
   * Récupère les préférences IA de l'étudiant (modèle préféré, mode libre).
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getPreferences(user.id);
  }

  /**
   * PUT /api/v1/chat/preferences
   * Met à jour les préférences IA de l'étudiant.
   */
  @Put('preferences')
  async updatePreferences(
    @Body() body: UpdateAiPreferencesDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = updateAiPreferencesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Format de préférences IA invalide.');
    }
    return this.chatService.updatePreferences(user.id, parseResult.data);
  }

  /**
   * GET /api/v1/chat/conversations
   * Liste les conversations de l'utilisateur avec filtre actif/archivé.
   */
  @Get('conversations')
  async listConversations(
    @Query() query: ListConversationsQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = listConversationsQuerySchema.safeParse(query);
    const status = parseResult.success && parseResult.data.status ? parseResult.data.status : 'active';
    return this.chatService.listConversations(user.id, status);
  }

  /**
   * POST /api/v1/chat/conversations
   * Crée une nouvelle conversation.
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Body() body: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = createConversationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Format de création de conversation invalide.');
    }
    return this.chatService.createConversation(user.id, parseResult.data);
  }

  /**
   * GET /api/v1/chat/conversations/:id
   * Détails d'une conversation.
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.chatService.getConversation(id, user.id);
  }

  /**
   * PATCH /api/v1/chat/conversations/:id
   * Renomme (title) et/ou archive/désarchive une conversation.
   */
  @Patch('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = updateConversationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Format de mise à jour de conversation invalide.');
    }
    return this.chatService.updateConversation(id, user.id, parseResult.data);
  }

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Liste les messages d'une conversation.
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.chatService.getMessages(id, user.id);
  }

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Envoie un message et reçoit la réponse du Mentor IA.
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = sendMessageSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Format de message invalide.');
    }
    return this.chatService.sendMessage(id, user.id, parseResult.data);
  }

  /**
   * DELETE /api/v1/chat/conversations/:id
   * Supprime une conversation.
   */
  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.chatService.deleteConversation(id, user.id);
  }
}
