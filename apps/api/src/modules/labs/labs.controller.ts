import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LabsService } from './services/labs.service';
import { LabSessionsService } from './services/lab-sessions.service';
import { LabValidationService } from './services/lab-validation.service';
import { SaveLabFilesSchema } from './dto/save-files.dto';
import { ValidateLabSessionSchema } from './dto/session-actions.dto';
import type {
  LabPublicDetailDto,
  LabSessionDto,
  LabVerdictDto,
  LabHintResponseDto,
} from './dto/lab-responses.dto';

@Controller('labs')
@UseGuards(AuthGuard)
export class LabsController {
  constructor(
    @Inject(LabsService) private readonly labsService: LabsService,
    @Inject(LabSessionsService) private readonly sessionsService: LabSessionsService,
    @Inject(LabValidationService) private readonly validationService: LabValidationService
  ) {}

  /**
   * Récupère la définition publique d'un lab (contexte, objectifs, fichiers initiaux).
   */
  @Get(':slug')
  async getLab(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<LabPublicDetailDto> {
    return this.labsService.getPublicLab(slug, user.id);
  }

  /**
   * Démarre une session de travail pour le lab.
   */
  @Post(':slug/sessions')
  async startSession(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: Request
  ): Promise<LabSessionDto> {
    const ip = req?.ip || (req?.headers['x-forwarded-for'] as string) || null;
    return this.sessionsService.startSession(user.id, slug, ip);
  }

  /**
   * Récupère l'état d'une session de travail.
   */
  @Get(':slug/sessions/:id')
  async getSession(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<LabSessionDto> {
    return this.sessionsService.getSession(user.id, slug, id);
  }

  /**
   * Sauvegarde les fichiers modifiés par l'utilisateur.
   */
  @Put(':slug/sessions/:id/files')
  async saveFiles(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<{ success: boolean; savedFiles: Array<{ path: string; size: number }> }> {
    const parseResult = SaveLabFilesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Format des fichiers invalide',
        errors: parseResult.error.flatten(),
      });
    }

    return this.sessionsService.saveFiles(user.id, slug, id, parseResult.data.files);
  }

  /**
   * Lance la validation de la session côté serveur.
   */
  @Post(':slug/sessions/:id/validate')
  async validateSession(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: Request
  ): Promise<LabVerdictDto> {
    const parseResult = ValidateLabSessionSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Format de la requête de validation invalide',
        errors: parseResult.error.flatten(),
      });
    }

    const ip = req?.ip || (req?.headers['x-forwarded-for'] as string) || null;
    return this.validationService.validateSession(
      user.id,
      slug,
      id,
      parseResult.data.files,
      ip
    );
  }

  /**
   * Consomme l'indice suivant pour la session.
   */
  @Post(':slug/sessions/:id/hint')
  async consumeHint(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<LabHintResponseDto> {
    return this.sessionsService.consumeHint(user.id, slug, id);
  }

  /**
   * Arrête et nettoie la session de lab.
   */
  @Post(':slug/sessions/:id/stop')
  async stopSession(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req?: Request
  ): Promise<LabSessionDto> {
    const ip = req?.ip || (req?.headers['x-forwarded-for'] as string) || null;
    return this.sessionsService.stopSession(user.id, slug, id, ip);
  }
}
