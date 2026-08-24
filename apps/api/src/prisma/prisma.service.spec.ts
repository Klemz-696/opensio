import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaService } from './prisma.service';

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
});
