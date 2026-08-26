import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '../../modules/auth/services/jwt.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('En-tête Authorization manquant');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Format du jeton d\'autorisation invalide (attendu: Bearer <token>)');
    }

    try {
      const payload = this.jwtService.verifyAccessToken(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Jeton d\'accès expiré ou invalide');
    }
  }
}
