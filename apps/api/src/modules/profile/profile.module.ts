import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AvatarStorageService } from './avatar-storage.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService, AvatarStorageService],
  exports: [ProfileService, AvatarStorageService],
})
export class ProfileModule {}
