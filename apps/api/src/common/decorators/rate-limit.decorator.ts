import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  limit: number;
  ttlSeconds: number;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (limit: number, ttlSeconds: number = 60): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_KEY, { limit, ttlSeconds });
