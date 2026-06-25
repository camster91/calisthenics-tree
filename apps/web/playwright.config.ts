import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Calisthenics web app a11y test suite.
 *
 * Targets the dev server (Vite) at :5173. The webServer block starts
 * it automatically if it isn't already running. CI overrides via
 * `PLAYWRIGHT_BASE_URL`.
 *
 * Single project, single worker — these tests touch shared dev-server
 * state (theme persisted in localStorage) and don't benefit from
 * parallelism. They run in <30s.
 */
const PORT = Number(process.env.PORT ?? 5173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Desktop default; mobile is exercised by a separate project if needed.
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
