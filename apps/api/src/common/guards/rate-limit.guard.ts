import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator';

interface RequestRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly storage = new Map<string, RequestRecord>();
  private readonly defaultLimit = 5;
  private readonly defaultTtlSeconds = 60;

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {
    // Nettoyage périodique toutes les 5 minutes pour éviter l'accumulation mémoire
    const cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    cleanupInterval.unref?.();
  }

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const limit = options?.limit ?? this.defaultLimit;
    const ttlMs = (options?.ttlSeconds ?? this.defaultTtlSeconds) * 1000;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const ip = this.extractClientIp(request);
    const key = `${ip}:${request.path}`;
    const now = Date.now();
    const windowStart = now - ttlMs;

    let record = this.storage.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.storage.set(key, record);
    }

    // Filtrer les requêtes hors de la fenêtre glissante
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + ttlMs - now) / 1000);

      response.setHeader('Retry-After', retryAfterSeconds > 0 ? retryAfterSeconds : 1);

      throw new HttpException(
        {
          type: 'https://httpstatuses.com/429',
          title: 'Too Many Requests',
          status: HttpStatus.TOO_MANY_REQUESTS,
          detail: `Trop de requêtes depuis cette adresse IP. Veuillez patienter ${retryAfterSeconds} secondes.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    return true;
  }

  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  private cleanup(): void {
    const now = Date.now();
    const maxTtlMs = 10 * 60 * 1000;
    for (const [key, record] of this.storage.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > now - maxTtlMs);
      if (record.timestamps.length === 0) {
        this.storage.delete(key);
      }
    }
  }

  public reset(): void {
    this.storage.clear();
  }
}
