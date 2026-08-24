import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TerminalGateway } from './terminal.gateway';
import { TerminalController } from './terminal.controller';
import { TerminalService } from './services/terminal.service';
import { SimulationCommandInterpreter } from './services/simulation-command-interpreter.service';
import { SimulatedNetworkService } from './services/simulated-network.service';
import { SimulatedFilesystemService } from './services/simulated-filesystem.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TerminalController],
  providers: [
    TerminalGateway,
    TerminalService,
    SimulationCommandInterpreter,
    SimulatedNetworkService,
    SimulatedFilesystemService,
  ],
  exports: [
    TerminalGateway,
    TerminalService,
    SimulationCommandInterpreter,
    SimulatedNetworkService,
    SimulatedFilesystemService,
  ],
})
export class TerminalModule {}
