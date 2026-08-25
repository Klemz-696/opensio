import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function assertTestDatabaseIsolation(): void {
  if (process.env.NODE_ENV === 'test') {
    const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
    const isDevDb = dbUrl.endsWith('/opensio') || dbUrl.includes('/opensio?');
    const isTestDb = dbUrl.includes('test') || dbUrl.includes('_test');
    if (!isTestDb || isDevDb) {
      throw new Error(
        `[GARDE-FOU BASE DE DONNÉES] En mode test (NODE_ENV=test), DATABASE_URL ne doit jamais cibler la base de développement (${process.env.DATABASE_URL}). Les tests doivent impérativement cibler la base de test isolée (opensio_test).`
      );
    }
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    assertTestDatabaseIsolation();
    super();
  }

  async onModuleInit(): Promise<void> {
    assertTestDatabaseIsolation();
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
