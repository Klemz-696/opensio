import { describe, expect, it } from 'vitest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (Lot 0 baseline)', () => {
  it('should return health check payload with status ok', () => {
    const appService = new AppService();
    const appController = new AppController(appService);
    const result = appController.getHealth();

    expect(result.status).toBe('ok');
    expect(result.version).toBe('1.0.0');
    expect(result.timestamp).toBeDefined();
  });
});
