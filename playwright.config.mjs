import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT || '3199';
const baseURL = `http://127.0.0.1:${port}`;

if (!process.env.E2E_DATABASE_URL) {
  throw new Error('Run Playwright through pnpm test:e2e with TEST_DATABASE_URL set.');
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `pnpm exec next dev --port ${port} --hostname 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      POSTGRES_URL: process.env.E2E_DATABASE_URL,
      AUTH_SECRET: 'playwright-only-session-signing-secret',
      STRIPE_SECRET_KEY: 'sk_test_playwright_placeholder',
      BASE_URL: baseURL
    }
  }
});
