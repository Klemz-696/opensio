import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressAggregationService } from './progress-aggregation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProgressController],
  providers: [ProgressService, ProgressAggregationService],
  exports: [ProgressService, ProgressAggregationService],
})
export class ProgressModule {}
