/**
 * /feed happy path — shows unlock events for the authed user + friends.
 */
import { test, expect } from '@playwright/test';

import { seedAuthedSession, mockRoutes, SAMPLE_FEED } from './_helpers';

test.beforeEach(async ({ page }) => {
  await seedAuthedSession(page);
  await mockRoutes(page, [
    { method: 'GET', path: /\/api\/v1\/feed/, body: SAMPLE_FEED },
  ]);
});

test('feed renders the unlock events', async ({ page }) => {
  await page.goto('/feed');

  await expect(
    page.getByRole('heading', { name: /your activity/i }),
  ).toBeVisible();
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect(page.getByText(/Incline Push-Up/)).toBeVisible();
});

test('feed empty state when no items', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'ct:onboarding',
        JSON.stringify({
          answers: {
            can_pull_up: true,
            support_hold_15s: false,
            active_hang_10s: null,
            rir2_pushup_reps: 8,
          },
          result: null,
        }),
      );
    } catch {
      /* ignore */
    }
  });
  // Override the mock for this test only. Register at context level so it
  // survives the full test lifecycle (see _helpers.ts comment for the bug
  // this works around).
  await page.context().route(/\/api\/v1\/feed/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }),
  );

  await page.goto('/feed');
  await expect(page.getByText(/nothing yet/i)).toBeVisible();
});