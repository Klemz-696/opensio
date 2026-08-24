import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import type { DashboardResponseDto } from './dto/dashboard-response.dto';

@Controller()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
  ) {}

  /**
   * GET /api/v1/me/dashboard
   * Vue agrégée étudiant : progression globale, reprise, quiz, activité et recommandations.
   */
  @Get('me/dashboard')
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboard(user.id);
  }
}
