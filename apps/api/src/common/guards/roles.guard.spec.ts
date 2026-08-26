import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createMockContext(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (§29.2)', () => {
  it('autorise l\'accès si aucun rôle n\'est requis', () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => null;

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ role: Role.APPRENANT });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('autorise l\'accès si l\'utilisateur possède le rôle requis', () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => [Role.ADMIN];

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('interdit l\'accès si le rôle de l\'utilisateur ne correspond pas', () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => [Role.ADMIN];

    const guard = new RolesGuard(reflector);
    const context = createMockContext({ role: Role.APPRENANT });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('interdit l\'accès si l\'utilisateur n\'est pas injecté dans la requête', () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => [Role.APPRENANT];

    const guard = new RolesGuard(reflector);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
