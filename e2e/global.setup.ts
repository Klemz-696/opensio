import { execSync } from 'node:child_process';

const TEST_DB = 'opensio_test';
const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_URL = `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`;

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: TEST_URL,
  JWT_SECRET: 'e2e-tests-only-not-a-real-secret-0123456789abcdef0123456789abcdef',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345678!',
  SEED_STUDENT_PASSWORD: 'StudentOpenSIO2026!',
  DEMO_SEED: 'true',
};

function psql(sql: string) {
  if (process.env.CI) {
    execSync(`psql "${ADMIN_URL}" -c "${sql}"`, { stdio: 'inherit', env });
  } else {
    execSync(`docker exec opensio-postgres psql -U postgres -c "${sql}"`, { stdio: 'inherit' });
  }
}

export default async function globalSetup() {
  console.log('[E2E] Préparation de la base de test...');
  psql(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  psql(`CREATE DATABASE ${TEST_DB}`);
  execSync('pnpm --filter @opensio/api exec prisma db push --schema=prisma/schema --skip-generate', { stdio: 'inherit', env });
  execSync('pnpm --filter @opensio/api seed', { stdio: 'inherit', env });
  execSync('pnpm --filter @opensio/api content:sync', { stdio: 'inherit', env });
  console.log('[E2E] Base de test prête.');
}