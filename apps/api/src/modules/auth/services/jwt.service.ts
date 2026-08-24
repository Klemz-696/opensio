import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface JwtAccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

export interface UserTokenProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresInSeconds = 15 * 60; // 15 minutes (D-09)

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 64) {
      throw new Error(
        'Configuration invalide : JWT_SECRET doit être défini et comporter au moins 64 caractères (D-09)',
      );
    }
    this.secret = secret;
  }

  generateAccessToken(user: UserTokenProfile): string {
    const payload: JwtAccessTokenPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    };

    return jwt.sign(payload, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.expiresInSeconds,
    });
  }

  verifyAccessToken(token: string): JwtAccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      });
      return decoded as JwtAccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Jeton d\'accès invalide ou expiré');
    }
  }
}
