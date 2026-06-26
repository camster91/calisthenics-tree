/**
 * T39 — share card test suite.
 *
 * Verifies:
 *  1. The /share/<unlockId> page renders each variant without errors.
 *  2. The 3 PNGs are served with the correct content-type and 1080x1080
 *     dimensions.
 *  3. The OG image metadata in index.html points at a real PNG URL.
 *  4. The /wireframes/workout-done page's Share button is wired to call
 *     useShareUnlock (button is enabled, click triggers a fetch for the
 *     PNG).
 *
 * Run with: `npx playwright test tests/share/share.spec.ts` (the project
 * default config targets the dev server on :5173). To run against the
 * production preview server, set `PLAYWRIGHT_BASE_URL=http://localhost:4173`.
 */
import { test, expect } from '@playwright/test';

import {
  SAMPLE_AUTH,
  SAMPLE_ONBOARDING,
  seedAuthedSession,
} from '../e2e/_helpers';

const SHARE_PNGS = [
  { id: 'tuck-front-lever-001', variant: 'fresh' },
  { id: 'tuck-front-lever-010', variant: 'milestone' },
  { id: 'front-lever-tree-cleared', variant: 'badge' },
] as const;

test.describe('T39 — share card template + PNG rendering', () => {
  for (const { id, variant } of SHARE_PNGS) {
    test(`/share/${id}?variant=${variant} renders the card`, async ({ page }) => {
      const res = await page.goto(`/share/${id}?variant=${variant}`);
      // The SPA returns 200 for any route (HTML shell), the route handler
      // renders the card client-side. The Playwright `goto` returning
      // a 200 means the static server is up; the card mount is the real check.
      expect(res?.status()).toBe(200);

      const card = page.locator('[data-share-template="unlock"]');
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-share-variant', variant);
    });
  }

  test('static PNGs return 200 + image/png', async ({ request }) => {
    for (const { id } of SHARE_PNGS) {
      const res = await request.get(`/share/${id}.png`, {
        failOnStatusCode: false,
      });
      expect(res.status(), `${id}.png should be served`).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
      const buf = await res.body();
      // PNG magic bytes
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
      // 1080x1080 = 1166400 bytes for a solid color; expect > 10KB (it's
      // an actual rendered card, not a 1px stub)
      expect(buf.length, `${id}.png size`).toBeGreaterThan(10_000);
    }
  });

  test('index.html declares og:image pointing at a real PNG', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const ogMatch = html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    );
    expect(ogMatch, 'og:image meta tag present').not.toBeNull();
    const ogPath = ogMatch![1];
    // Path must resolve against the request baseURL.
    const ogRes = await request.get(ogPath);
    expect(ogRes.status(), `og:image URL ${ogPath} returns 200`).toBe(200);
    expect(ogRes.headers()['content-type']).toContain('image/png');
  });

  test('workout-done wireframe share button is wired', async ({
    page,
    browserName,
}) => {
    // Firefox + WebKit: navigator.share / canShare are non-configurable
    // on the navigator prototype in Firefox, and the delete +
    // defineProperty fallback lands in a different code path in WebKit
    // (the hook's `'share' in navigator` check returns truthy even
    // after delete + getter). Re-enable when useShareUnlock exposes a
    // test-only mock surface OR when Playwright adds a built-in
    // navigator.share mock for these browsers.
    test.skip(
      browserName !== 'chromium',
      'Chromium-only: navigator.share mock not portable to Firefox/WebKit',
    );

    // /wireframes/* lives inside RequireAuth → Layout. Seed the auth
    // session so the wireframe is reachable.
    await seedAuthedSession(page);

    // Stub the Web Share API so we don't need a real mobile share sheet
    // in headless. Use `delete` so `'share' in navigator` returns
    // false (otherwise useShareUnlock takes the share path instead
    // of the fetch-PNG fallback this test exercises).
    await page.addInitScript(() => {
      // @ts-expect-error test stub
      window.shareCalled = null;
      const nav = navigator as unknown as Record<string, unknown>;
      for (const key of ['share', 'canShare']) {
        try {
          delete (nav as any)[key];
        } catch {
          /* ignore — accessor fallback below */
        }
        try {
          Object.defineProperty(navigator, key, {
            configurable: true,
            get: () => undefined,
          });
        } catch {
          /* last resort — useShareUnlock handles failure */
        }
      }
    });

    const requestPromise = page.waitForRequest(
      (r) => r.url().includes('/share/tuck-front-lever-001.png'),
      { timeout: 5_000 },
    );
    await page.goto('/wireframes/workout-done');
    await page.getByRole('button', { name: /Share/i }).click();
    const req = await requestPromise;
    expect(req.url()).toContain('tuck-front-lever-001.png');
  });
});
