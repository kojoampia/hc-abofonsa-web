import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the full docker compose stack (mongo + api + web SSR), not a mocked
 * frontend — spec §11.3's journeys are only meaningful end to end. Bring it up with
 * `docker compose up -d --build` from the repository root, or let CI's e2e job do it.
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // journeys mutate shared CMS state; keep them ordered and isolated
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: './e2e/test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
