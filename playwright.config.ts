import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @opensio/api dev',
      port: 4000,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        NODE_ENV: 'test',
        SKIP_RATE_LIMIT: 'true',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/opensio_test',
        JWT_SECRET: 'e2e-tests-only-not-a-real-secret-0123456789abcdef0123456789abcdef',
      },
    },
    {
      command: 'pnpm --filter @opensio/web dev',
      port: 3000,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'inherit',
      stderr: 'inherit',
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});