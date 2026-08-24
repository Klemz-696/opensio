import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProgressModule } from '../progress/progress.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [PrismaModule, AuthModule, ProgressModule],
  controllers: [DashboardController],
  providers: [DashboardService, RecommendationsService],
  exports: [DashboardService],
})
export class DashboardModule {}
