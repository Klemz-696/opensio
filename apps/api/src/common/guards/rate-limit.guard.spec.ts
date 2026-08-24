import { beforeEach, describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function createMockContext(ip: string, path: string): ExecutionContext {
  const headers: Record<string, string> = { 'x-forwarded-for': ip };
  const resHeaders: Record<string, unknown> = {};

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        path,
        ip,
        socket: { remoteAddress: ip },
      }),
      getResponse: () => ({
        setHeader: (k: string, v: unknown) => {
          resHeaders[k] = v;
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard (5 connexions/min/IP)', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    reflector.getAllAndOverride = () => ({ limit: 5, ttlSeconds: 60 });
    guard = new RateLimitGuard(reflector);
    guard.reset();
  });

  it('autorise jusqu\'à 5 requêtes consécutives dans la minute pour une même IP', () => {
    const context = createMockContext('192.168.1.50', '/api/v1/auth/login');

    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('bloque la 6ème requête avec une erreur HTTP 429 Too Many Requests', () => {
    const context = createMockContext('192.168.1.50', '/api/v1/auth/login');

    for (let i = 0; i < 5; i++) {
      guard.canActivate(context);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('traite les adresses IP séparément', () => {
    const contextA = createMockContext('192.168.1.1', '/api/v1/auth/login');
    const contextB = createMockContext('192.168.1.2', '/api/v1/auth/login');

    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(contextA)).toBe(true);
    }

    // IP B doit toujours pouvoir faire des requêtes
    expect(guard.canActivate(contextB)).toBe(true);
  });
});
