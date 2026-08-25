import { describe, it, expect } from 'vitest';
import { validateEnv } from '../env.validation';

describe('validateEnv', () => {
  const validBaseConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://opensio:secret@localhost:5432/opensio',
    JWT_SECRET: 'a-very-strong-and-random-64-bytes-secret-key-that-is-not-a-default-template-key-for-test',
  };

  it('devrait valider une configuration valide', () => {
    const config = validateEnv(validBaseConfig);
    expect(config.NODE_ENV).toBe('development');
    expect(config.API_PORT).toBe(4000);
    expect(config.JWT_SECRET).toBe(validBaseConfig.JWT_SECRET);
  });

  it('devrait rejeter un JWT_SECRET de moins de 64 caractères', () => {
    expect(() =>
      validateEnv({
        ...validBaseConfig,
        JWT_SECRET: 'trop-court',
      })
    ).toThrow('JWT_SECRET doit contenir au moins 64 caractères');
  });

  it('devrait rejeter un JWT_SECRET contenant la valeur de template change-this en mode non-test', () => {
    expect(() =>
      validateEnv({
        ...validBaseConfig,
        NODE_ENV: 'production',
        JWT_SECRET: 'change-this-to-a-very-secure-random-64-bytes-secret-key-for-jwt-signing',
      })
    ).toThrow('JWT_SECRET non sécurisé');
  });

  it('devrait accepter un JWT_SECRET en mode test même avec des placeholders', () => {
    const config = validateEnv({
      ...validBaseConfig,
      NODE_ENV: 'test',
      JWT_SECRET: 'ci-dummy-secret-pour-tests-uniquement-pas-un-vrai-secret-64chars',
    });
    expect(config.NODE_ENV).toBe('test');
  });
});
