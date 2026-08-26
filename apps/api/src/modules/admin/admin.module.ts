import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, RolesGuard],
  exports: [AdminUsersService],
})
export class AdminModule {}
