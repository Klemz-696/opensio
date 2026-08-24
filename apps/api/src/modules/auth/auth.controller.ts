import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './services/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { registerSchema, type RegisterDto } from './dto/register.dto';
import { loginSchema, type LoginDto } from './dto/login.dto';
import { forgotPasswordSchema, type ForgotPasswordDto } from './dto/forgot-password.dto';
import { resetPasswordSchema, type ResetPasswordDto } from './dto/reset-password.dto';

const COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller('auth')
export class AuthController {
  private readonly ttlDays: number;

  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    this.ttlDays = process.env.REFRESH_TOKEN_TTL_DAYS
      ? parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10)
      : 7;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.authService.register(dto, ip);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Cookie de rafraîchissement absent');
    }

    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.refresh(rawRefreshToken, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
    const ip = this.extractClientIp(req);

    await this.authService.logout(rawRefreshToken, ip);

    res.clearCookie(COOKIE_NAME, {
      path: REFRESH_COOKIE_PATH,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.authService.forgotPassword(dto, ip);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const ip = this.extractClientIp(req);
    return this.authService.resetPassword(dto, ip);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.ttlDays * 24 * 60 * 60 * 1000,
    });
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
