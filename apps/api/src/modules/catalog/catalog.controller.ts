import {
  Controller,
  Get,
  Inject,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';
import type {
  LessonDetailDto,
  ModuleDetailDto,
  ModuleSummaryDto,
  TrackSummaryDto,
} from './dto/catalog-responses.dto';

@Controller()
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  /**
   * GET /api/v1/tracks
   * Liste des années de formation avec progression agrégée de l'utilisateur.
   */
  @Get('tracks')
  async getTracks(
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<TrackSummaryDto[]> {
    return this.catalogService.getTracks(user?.id);
  }

  /**
   * GET /api/v1/tracks/:slug/modules
   * Liste des modules d'une année de formation avec état de progression.
   */
  @Get('tracks/:slug/modules')
  async getModulesByTrack(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ModuleSummaryDto[]> {
    return this.catalogService.getModulesByTrack(slug, user?.id);
  }

  /**
   * GET /api/v1/modules/:slug
   * Détail d'un module (leçons ordonnées, quiz, labs, prérequis) avec statuts.
   */
  @Get('modules/:slug')
  async getModuleBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ModuleDetailDto> {
    return this.catalogService.getModuleBySlug(slug, user?.id);
  }

  /**
   * GET /api/v1/lessons/:slug
   * Contenu complet d'une leçon avec Markdown sécurisé et statut de progression.
   */
  @Get('lessons/:slug')
  async getLessonBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<LessonDetailDto> {
    return this.catalogService.getLessonBySlug(slug, user?.id);
  }
}
