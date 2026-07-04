/**
 * Offline banner — Sprint 42 PR-3c: Layout mounts an OfflineBanner
 * that listens to navigator online/offline events. When the browser
 * goes offline, a sticky banner appears at the top of the page so
 * the user knows their /workouts/sync calls will fail until the
 * connection comes back.
 */
import { test, expect } from '@playwright/test';

import { mockRoutes, seedAuthedSession, SAMPLE_TREES } from './_helpers';

test.beforeEach(async ({ page }) => {
  // Need an authed + onboarded session so the page mounts inside
  // <Layout> (which is where OfflineBanner lives). Anonymous users
  // hit /login, which is OUTSIDE Layout, so the banner never
  // mounts for them.
  await seedAuthedSession(page);
  await mockRoutes(page, [
    { method: 'GET', path: /\/api\/v1\/trees/, body: SAMPLE_TREES },
  ]);
});

test('offline banner is hidden when online (default)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});

test('offline banner appears when navigator goes offline', async ({
  page,
}) => {
  await page.goto('/');
  // Sanity: hidden by default.
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);

  // Dispatch the offline event directly in the browser context.
  // `page.context().setOffline(true)` would actually block the Vite
  // dev server, which would prevent the page from loading in the
  // first place. The browser's `offline` event is what we listen for
  // — firing it via the standard DOM API exercises the same code path.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });

  // The banner mounts immediately (no debounce) once the event fires.
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await expect(page.getByTestId('offline-banner')).toContainText(/offline/i);
});

test('offline banner disappears when navigator comes back online', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});

test('offline banner is shown on initial load if browser was already offline', async ({
  page,
}) => {
  // Override navigator.onLine BEFORE the app mounts by injecting an
  // init script. This mimics the case where the user opens the app
  // while their device is already offline.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('offline-banner')).toBeVisible();
});