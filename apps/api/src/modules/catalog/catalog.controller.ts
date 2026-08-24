import {
  Controller,
  Get,
  Inject,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
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
   * Liste des années de formation.
   */
  @Get('tracks')
  async getTracks(): Promise<TrackSummaryDto[]> {
    return this.catalogService.getTracks();
  }

  /**
   * GET /api/v1/tracks/:slug/modules
   * Liste des modules d'une année de formation.
   */
  @Get('tracks/:slug/modules')
  async getModulesByTrack(
    @Param('slug') slug: string,
  ): Promise<ModuleSummaryDto[]> {
    return this.catalogService.getModulesByTrack(slug);
  }

  /**
   * GET /api/v1/modules/:slug
   * Détail d'un module (leçons ordonnées, quiz, labs, prérequis).
   */
  @Get('modules/:slug')
  async getModuleBySlug(
    @Param('slug') slug: string,
  ): Promise<ModuleDetailDto> {
    return this.catalogService.getModuleBySlug(slug);
  }

  /**
   * GET /api/v1/lessons/:slug
   * Contenu complet d'une leçon avec Markdown sécurisé.
   */
  @Get('lessons/:slug')
  async getLessonBySlug(
    @Param('slug') slug: string,
  ): Promise<LessonDetailDto> {
    return this.catalogService.getLessonBySlug(slug);
  }
}
