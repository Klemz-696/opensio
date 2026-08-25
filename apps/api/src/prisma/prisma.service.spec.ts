import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaService, assertTestDatabaseIsolation } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on module init', async () => {
    const connectSpy = vi
      .spyOn(service, '$connect')
      .mockImplementation(async () => {});
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('should disconnect on module destroy', async () => {
    const disconnectSpy = vi
      .spyOn(service, '$disconnect')
      .mockImplementation(async () => {});
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('devrait refuser la connexion si DATABASE_URL pointe vers la base de dev en mode test', () => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://opensio:secret@localhost:5432/opensio';
    expect(() => assertTestDatabaseIsolation()).toThrow('[GARDE-FOU BASE DE DONNÉES]');
    process.env.DATABASE_URL = originalUrl;
  });
});
