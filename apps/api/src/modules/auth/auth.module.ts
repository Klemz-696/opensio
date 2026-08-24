import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { PasswordResetService } from './services/password-reset.service';
import { JwtService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AuthController],
  providers: [
    PasswordService,
    PasswordResetService,
    JwtService,
    RefreshTokenService,
    AuthService,
    AuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    AuthService,
    PasswordService,
    PasswordResetService,
    JwtService,
    RefreshTokenService,
    AuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
})
export class AuthModule {}
