import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtService, UserTokenProfile } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordResetService } from './password-reset.service';
import { AuditService } from '../../audit/audit.service';
import type { RegisterDto } from '../dto/register.dto';
import type { LoginDto } from '../dto/login.dto';
import type { ForgotPasswordDto } from '../dto/forgot-password.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';

export interface AuthSuccessResult {
  accessToken: string;
  refreshToken: string;
  user: UserTokenProfile;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RefreshTokenService) private readonly refreshTokenService: RefreshTokenService,
    @Inject(PasswordResetService) private readonly passwordResetService: PasswordResetService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<UserProfileResponse> {
    const isRegistrationEnabled =
      process.env.REGISTRATION_ENABLED?.toLowerCase() === 'true';

    if (!isRegistrationEnabled) {
      throw new ForbiddenException(
        'L\'inscription publique est actuellement désactivée sur cette instance.',
      );
    }

    const policy = this.passwordService.validatePolicy(dto.password);
    if (!policy.valid) {
      throw new BadRequestException({
        message: 'Mot de passe non conforme à la politique de sécurité.',
        errors: policy.errors,
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Une adresse email identique est déjà utilisée.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    await this.auditService.logEvent({
      action: 'AUTH_REGISTER',
      actorId: user.id,
      targetType: 'user',
      targetId: user.id,
      ip,
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthSuccessResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      await this.auditService.logEvent({
        action: 'AUTH_LOGIN_FAILED',
        actorId: user?.id ?? null,
        targetType: 'user',
        metadata: { email: dto.email, reason: 'user_not_found_or_inactive' },
        ip,
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const isPasswordValid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.auditService.logEvent({
        action: 'AUTH_LOGIN_FAILED',
        actorId: user.id,
        targetType: 'user',
        targetId: user.id,
        metadata: { email: dto.email, reason: 'invalid_password' },
        ip,
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userProfile: UserTokenProfile = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    const accessToken = this.jwtService.generateAccessToken(userProfile);
    const refreshToken = await this.refreshTokenService.createRefreshToken({
      userId: user.id,
      ip,
      userAgent,
    });

    await this.auditService.logEvent({
      action: 'AUTH_LOGIN_SUCCESS',
      actorId: user.id,
      targetType: 'user',
      targetId: user.id,
      ip,
    });

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }

  async refresh(rawRefreshToken: string, ip?: string, userAgent?: string): Promise<AuthSuccessResult> {
    const { newRawToken, user } = await this.refreshTokenService.rotateRefreshToken(
      rawRefreshToken,
      ip,
      userAgent,
    );

    const userProfile: UserTokenProfile = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    const accessToken = this.jwtService.generateAccessToken(userProfile);

    await this.auditService.logEvent({
      action: 'AUTH_REFRESH',
      actorId: user.id,
      targetType: 'user',
      targetId: user.id,
      ip,
    });

    return {
      accessToken,
      refreshToken: newRawToken,
      user: userProfile,
    };
  }

  async logout(rawRefreshToken?: string, ip?: string): Promise<{ success: boolean }> {
    if (rawRefreshToken) {
      await this.refreshTokenService.revokeRefreshToken(rawRefreshToken, ip);
    }
    return { success: true };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    ip?: string,
  ): Promise<{ message: string; resetToken?: string }> {
    return this.passwordResetService.forgotPassword(dto, ip);
  }

  async resetPassword(
    dto: ResetPasswordDto,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.passwordResetService.resetPassword(dto, ip);
  }

  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
