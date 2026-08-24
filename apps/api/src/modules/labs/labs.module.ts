import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { LabsController } from './labs.controller';
import { LabsService } from './services/labs.service';
import { LabSessionsService } from './services/lab-sessions.service';
import { LabSessionFormatterService } from './services/lab-session-formatter.service';
import { LabSessionSweeperService } from './services/lab-session-sweeper.service';
import { LabScoringService } from './services/lab-scoring.service';
import { LabValidationService } from './services/lab-validation.service';
import { SimulationLabRunner } from './runners/simulation-lab-runner.service';
import { LAB_RUNNER_TOKEN } from './runners/lab-runner.interface';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [LabsController],
  providers: [
    LabsService,
    LabSessionsService,
    LabSessionFormatterService,
    LabSessionSweeperService,
    LabScoringService,
    LabValidationService,
    SimulationLabRunner,
    {
      provide: LAB_RUNNER_TOKEN,
      useExisting: SimulationLabRunner,
    },
  ],
  exports: [
    LabsService,
    LabSessionsService,
    LabSessionFormatterService,
    LabSessionSweeperService,
    LabScoringService,
    LabValidationService,
    LAB_RUNNER_TOKEN,
  ],
})
export class LabsModule {}
