import {
  Controller,
  Inject,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './services/chat.service';
import { createConversationSchema, type CreateConversationDto } from './dto/create-conversation.dto';
import { sendMessageSchema, type SendMessageDto } from './dto/send-message.dto';

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
   * GET /api/v1/chat/conversations
   * Liste les conversations de l'utilisateur.
   */
  @Get('conversations')
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.listConversations(user.id);
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
