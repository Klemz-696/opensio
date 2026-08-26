import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProfileService } from './profile.service';
import { AvatarStorageService } from './avatar-storage.service';
import { updateProfileSchema, type UpdateProfileDto } from './dto/update-profile.dto';
import {
  updatePreferencesSchema,
  type UpdatePreferencesDto,
} from './dto/update-preferences.dto';

@Controller()
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profileService: ProfileService,
    @Inject(AvatarStorageService) private readonly avatarStorage: AvatarStorageService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.profileService.updateProfile(user.id, dto, ip);
  }

  @UseGuards(AuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier envoyé dans le champ "avatar".');
    }
    const ip = this.extractClientIp(req);
    return this.profileService.uploadAvatar(user.id, file, ip);
  }

  @UseGuards(AuthGuard)
  @Delete('profile/avatar')
  @HttpCode(HttpStatus.OK)
  async deleteAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.profileService.deleteAvatar(user.id, ip);
  }

  @UseGuards(AuthGuard)
  @Get('profile/preferences')
  @HttpCode(HttpStatus.OK)
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getPreferences(user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('profile/preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) dto: UpdatePreferencesDto,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.profileService.updatePreferences(user.id, dto, ip);
  }

  @UseGuards(AuthGuard)
  @Delete('profile')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.profileService.deleteAccount(user.id, ip);
  }

  @Public()
  @Get('users/avatar/:filename')
  getAvatar(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    const { stream, contentType, size } = this.avatarStorage.getAvatarStream(filename);

    res.set({
      'Content-Type': contentType,
      'Content-Length': size.toString(),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    });

    stream.pipe(res);
  }

  private extractClientIp(req?: Request): string {
    if (!req) return '127.0.0.1';
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
}
