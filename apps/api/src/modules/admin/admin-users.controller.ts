import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminUsersService } from './admin-users.service';
import { listUsersSchema, type ListUsersDto } from './dto/list-users.dto';
import { createUserSchema, type CreateUserDto } from './dto/create-user.dto';
import { updateUserSchema, type UpdateUserDto } from './dto/update-user.dto';
import {
  adminResetPasswordSchema,
  type AdminResetPasswordDto,
} from './dto/admin-reset-password.dto';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    @Inject(AdminUsersService) private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listUsers(
    @Query(new ZodValidationPipe(listUsersSchema)) query: ListUsersDto,
  ) {
    return this.adminUsersService.listUsers(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.adminUsersService.createUser(dto, user.id, ip);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.adminUsersService.updateUser(id, dto, user.id, ip);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminResetPasswordSchema)) dto: AdminResetPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.adminUsersService.resetPassword(id, dto, user.id, ip);
  }

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }
}
