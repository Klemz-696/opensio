import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { ProgressAggregationService } from './progress-aggregation.service';
import { CompleteLessonSchema, type CompleteLessonDto } from './dto/complete-lesson.dto';
import { LessonHeartbeatSchema, type LessonHeartbeatDto } from './dto/heartbeat.dto';
import type {
  LessonProgressDto,
  UserProgressTreeDto,
} from './dto/progress-responses.dto';
import type { PaginatedActivityEventsDto } from './dto/activity-event.dto';

@Controller()
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(
    @Inject(ProgressService) private readonly progressService: ProgressService,
    @Inject(ProgressAggregationService)
    private readonly aggregationService: ProgressAggregationService,
  ) {}

  /**
   * POST /api/v1/lessons/:slug/complete
   * Marque une leçon terminée avec cumul optionnel du temps passé.
   */
  @Post('lessons/:slug/complete')
  async completeLesson(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: CompleteLessonDto,
  ): Promise<LessonProgressDto> {
    const parsed = body ? CompleteLessonSchema.parse(body) : undefined;
    const timeSpent = parsed?.timeSpentSeconds ?? parsed?.seconds ?? 0;
    return this.progressService.completeLesson(user.id, slug, timeSpent);
  }

  /**
   * POST /api/v1/lessons/:slug/heartbeat
   * Cumul périodique du temps passé par l'étudiant sur la leçon.
   */
  @Post('lessons/:slug/heartbeat')
  async heartbeat(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: LessonHeartbeatDto,
  ): Promise<LessonProgressDto> {
    const parsed = LessonHeartbeatSchema.parse(body);
    return this.progressService.heartbeatLesson(user.id, slug, parsed.seconds);
  }

  /**
   * GET /api/v1/lessons/:slug/progress
   * Récupère l'état de progression d'une leçon individuelle.
   */
  @Get('lessons/:slug/progress')
  async getLessonProgress(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LessonProgressDto> {
    return this.progressService.getLessonProgress(user.id, slug);
  }

  /**
   * GET /api/v1/me/progress
   * Arborescence globale de progression de l'étudiant connecté.
   */
  @Get('me/progress')
  async getMyProgress(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProgressTreeDto> {
    return this.aggregationService.getUserProgressTree(user.id);
  }

  /**
   * GET /api/v1/me/activity
   * Historique d'activité chronologique paginé.
   */
  @Get('me/activity')
  async getMyActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PaginatedActivityEventsDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.progressService.getActivityEvents(user.id, pageNum, pageSizeNum);
  }
}
