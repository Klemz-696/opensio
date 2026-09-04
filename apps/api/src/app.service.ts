import { Injectable } from '@nestjs/common';

export interface HealthCheckResponse {
  status: string;
  version: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      version: '1.0.2',
      timestamp: new Date().toISOString(),
    };
  }
}
