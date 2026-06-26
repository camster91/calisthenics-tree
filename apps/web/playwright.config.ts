import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Calisthenics web app a11y test suite.
 *
 * Targets the dev server (Vite) at :5173. The webServer block starts
 * it automatically if it isn't already running. CI overrides via
 * `PLAYWRIGHT_BASE_URL`.
 *
 * Three projects — Chromium (primary), Firefox (CSS-rendering sanity),
 * WebKit (Safari / iOS preview). Each runs the full suite.
 *
 * Single worker per project — these tests touch shared dev-server
 * state (theme persisted in localStorage) and don't benefit from
 * cross-project parallelism. They run in <60s total across all 3.
 *
 * Run a single browser:
 *   npx playwright test --project=chromium
 *   npx playwright test --project=firefox
 *   npx playwright test --project=webkit
 *
 * Run all three (the default):
 *   npx playwright test
 */
const PORT = Number(process.env.PORT ?? 5173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
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
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
