import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../guards/auth.guard';

@Injectable()
export class SingleUserMiddleware implements NestMiddleware {
  private cachedAdmin: AuthenticatedUser | null = null;
  private lastCacheCheck = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 secondes

  constructor(private readonly prisma: PrismaService) {}

  async use(
    req: Request & { user?: AuthenticatedUser },
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const isSingleUser = process.env.SINGLE_USER_MODE === 'true';

    if (!isSingleUser) {
      return next();
    }

    // Si une authentification Bearer explicite valide est fournie, on laisse faire AuthGuard
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 10) {
      return next();
    }

    // Si déjà attaché
    if (req.user) {
      return next();
    }

    const now = Date.now();
    if (this.cachedAdmin && now - this.lastCacheCheck < this.CACHE_TTL_MS) {
      req.user = this.cachedAdmin;
      return next();
    }

    try {
      const admin = await this.prisma.user.findFirst({
        where: {
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      });

      if (admin) {
        this.cachedAdmin = {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.role,
        };
        this.lastCacheCheck = now;
        req.user = this.cachedAdmin;
      } else {
        // Recherche d'un premier utilisateur actif quelconque si aucun ADMIN spécifique
        const firstUser = await this.prisma.user.findFirst({
          where: { status: UserStatus.ACTIVE, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        });

        if (firstUser) {
          this.cachedAdmin = {
            id: firstUser.id,
            email: firstUser.email,
            displayName: firstUser.displayName,
            role: firstUser.role,
          };
          this.lastCacheCheck = now;
          req.user = this.cachedAdmin;
        }
      }
    } catch {
      // Ignorer si la base de données n'est pas encore connectée ou accessible
    }

    next();
  }
}
