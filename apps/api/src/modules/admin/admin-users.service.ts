import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { RefreshTokenService } from '../auth/services/refresh-token.service';
import { AuditService } from '../audit/audit.service';
import type { ListUsersDto, PaginatedUsersResponse, UserItemDto } from './dto/list-users.dto';
import type { CreateUserDto, CreateUserResponse } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { AdminResetPasswordDto, AdminResetPasswordResponse } from './dto/admin-reset-password.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(RefreshTokenService) private readonly refreshTokenService: RefreshTokenService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async listUsers(query: ListUsersDto): Promise<PaginatedUsersResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { displayName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: UserItemDto[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserById(id: string): Promise<UserItemDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async createUser(
    dto: CreateUserDto,
    actorId: string,
    ip?: string,
  ): Promise<CreateUserResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cette adresse email est déjà utilisée.');
    }

    const tempPassword = dto.temporaryPassword || this.passwordService.generateTemporaryPassword();

    const policy = this.passwordService.validatePolicy(tempPassword);
    if (!policy.valid) {
      throw new BadRequestException({
        message: 'Le mot de passe temporaire ne respecte pas la politique de sécurité.',
        errors: policy.errors,
      });
    }

    const passwordHash = await this.passwordService.hash(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        role: dto.role || Role.APPRENANT,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      },
    });

    await this.auditService.logEvent({
      action: 'ADMIN_USER_CREATE',
      actorId,
      targetType: 'user',
      targetId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      ip,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
      temporaryPassword: tempPassword,
    };
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    currentAdminId: string,
    ip?: string,
  ): Promise<UserItemDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Garde anti-autodestruction : l'admin ne peut pas se désactiver
    if (id === currentAdminId && dto.status === UserStatus.DISABLED) {
      throw new BadRequestException(
        'Action interdite : vous ne pouvez pas désactiver votre propre compte administrateur.',
      );
    }

    // Garde anti-autodestruction : l'admin ne peut pas se rétrograder lui-même
    if (id === currentAdminId && dto.role && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        'Action interdite : vous ne pouvez pas rétrograder votre propre rôle administrateur.',
      );
    }

    // Vérification d'unicité d'email si modifié
    if (dto.email && dto.email !== user.email) {
      const emailConflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict && emailConflict.id !== id) {
        throw new ConflictException('Cette adresse email est déjà utilisée.');
      }
    }

    // Si le compte est désactivé, révoquer immédiatement toutes ses sessions actives
    if (dto.status === UserStatus.DISABLED) {
      await this.refreshTokenService.revokeAllUserTokens(id);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    await this.auditService.logEvent({
      action: 'ADMIN_USER_UPDATE',
      actorId: currentAdminId,
      targetType: 'user',
      targetId: id,
      metadata: {
        changes: dto,
      },
      ip,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      status: updatedUser.status,
      mustChangePassword: updatedUser.mustChangePassword,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    };
  }

  async resetPassword(
    id: string,
    dto: AdminResetPasswordDto,
    actorId: string,
    ip?: string,
  ): Promise<AdminResetPasswordResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const tempPassword = dto.temporaryPassword || this.passwordService.generateTemporaryPassword();

    const policy = this.passwordService.validatePolicy(tempPassword);
    if (!policy.valid) {
      throw new BadRequestException({
        message: 'Le mot de passe temporaire ne respecte pas la politique de sécurité.',
        errors: policy.errors,
      });
    }

    const passwordHash = await this.passwordService.hash(tempPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Révocation de toutes les sessions actives de l'utilisateur réinitialisé
    await this.refreshTokenService.revokeAllUserTokens(id);

    await this.auditService.logEvent({
      action: 'ADMIN_USER_PASSWORD_RESET',
      actorId,
      targetType: 'user',
      targetId: id,
      metadata: {
        email: user.email,
      },
      ip,
    });

    return {
      temporaryPassword: tempPassword,
      message: 'Mot de passe réinitialisé avec succès.',
    };
  }
}
