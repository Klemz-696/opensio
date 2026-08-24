import {
  Controller,
  Inject,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TerminalService } from './services/terminal.service';
import { terminalCommandSchema, type TerminalCommandDto } from './dto/terminal-command.dto';

@Controller('labs/:slug/sessions/:id/terminal')
@UseGuards(AuthGuard)
export class TerminalController {
  constructor(@Inject(TerminalService) private readonly terminalService: TerminalService) {}

  /**
   * GET /api/v1/labs/:slug/sessions/:id/terminal
   * Récupère le statut initial et la bannière du terminal.
   */
  @Get()
  async getStatus(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.terminalService.getTerminalStatus(sessionId, user.id);
  }

  /**
   * POST /api/v1/labs/:slug/sessions/:id/terminal/exec
   * Exécute une commande de terminal dans la session (REST / Fallback).
   */
  @Post('exec')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('id') sessionId: string,
    @Body() body: TerminalCommandDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = terminalCommandSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Format de commande invalide.');
    }

    return this.terminalService.executeCommand(
      sessionId,
      user.id,
      parseResult.data.command
    );
  }
}
