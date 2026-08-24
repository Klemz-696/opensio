import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { JwtService } from './jwt.service';

describe('JwtService (HS256 D-09)', () => {
  const originalEnvSecret = process.env.JWT_SECRET;
  const validSecret = 'a'.repeat(64); // 64 caractères

  beforeEach(() => {
    process.env.JWT_SECRET = validSecret;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnvSecret;
  });

  it('lance une erreur si JWT_SECRET est absent ou fait moins de 64 caractères', () => {
    process.env.JWT_SECRET = 'short-secret';
    expect(() => new JwtService()).toThrow('au moins 64 caractères');

    delete process.env.JWT_SECRET;
    expect(() => new JwtService()).toThrow('au moins 64 caractères');
  });

  it('génère un access token valide contenant les claims attendus', () => {
    const service = new JwtService();
    const user = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'etudiant@opensio.local',
      displayName: 'Élève Test',
      role: UserRole.STUDENT,
    };

    const token = service.generateAccessToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = service.verifyAccessToken(token);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.displayName).toBe(user.displayName);
    expect(decoded.role).toBe(UserRole.STUDENT);
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('rejette un jeton avec une signature falsifiée', () => {
    const service = new JwtService();
    const user = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'etudiant@opensio.local',
      displayName: 'Élève Test',
      role: UserRole.STUDENT,
    };

    const token = service.generateAccessToken(user);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    expect(() => service.verifyAccessToken(tamperedToken)).toThrow('invalide ou expiré');
  });
});
