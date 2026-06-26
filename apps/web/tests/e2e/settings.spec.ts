/**
 * Settings happy path — display name form, sign-out, danger zone.
 */
import { test, expect } from '@playwright/test';

import {
  seedAuthedSession,
  mockRoutes,
  SAMPLE_AUTH,
  SAMPLE_ONBOARDING,
} from './_helpers';

const UPDATED_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'e2e@example.com',
  display_name: 'New Display Name',
  created_at: new Date().toISOString(),
};

/**
 * Seed the auth session directly into localStorage (NO addInitScript)
 * for sign-out tests, because addInitScript re-runs on every navigation
 * and would re-seed localStorage AFTER sign-out clears it.
 */
async function seedInline(page: import('@playwright/test').Page): Promise<void> {
  // Navigate to /welcome first (no auth gate) so localStorage is writable
  // without bouncing. Then set localStorage, then navigate to /settings.
  await page.goto('/welcome');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(
    ({ auth, onboarding }) => {
      window.localStorage.setItem('ct:auth', JSON.stringify(auth));
      window.localStorage.setItem('ct:onboarding', JSON.stringify(onboarding));
    },
    { auth: SAMPLE_AUTH, onboarding: SAMPLE_ONBOARDING },
  );
  // Verify the seed landed before navigating away
  const ctAuth = await page.evaluate(() => window.localStorage.getItem('ct:auth'));
  if (!ctAuth) {
    throw new Error('seedInline failed: ct:auth not set after evaluate');
  }
}

test.describe('settings with persisted auth', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthedSession(page);
    await mockRoutes(page, [
      {
        method: 'PATCH',
        path: /\/api\/v1\/users\/me/,
        body: UPDATED_USER,
      },
    ]);
    // POST /api/v1/users/me/export returns a JSON blob with an
    // attachment Content-Disposition header. Per-test (since the
    // download flow asserts on the response).
  });

  test('settings shows email and persists display name', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('e2e@example.com')).toBeVisible();

    const nameInput = page.locator('#display-name');
    await nameInput.fill('New Display Name');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/^Saved\.$/)).toBeVisible();
  });

  test('export button triggers a JSON download', async ({ page }) => {
    // Stub the export endpoint to return a JSON blob with the
    // attachment Content-Disposition header (matching what the real
    // backend sends — see apps/api/calisthenics_api/routes/users.py).
    const exportBody = JSON.stringify({
      profile: { email: 'e2e@example.com' },
      workouts: [],
      progressions: [],
      unlocks: [],
      social: { following: [], followers: [] },
    });
    await page.route('**/api/v1/users/me/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Disposition':
            'attachment; filename="calisthenics-tree-export-e2e-2026-06-26.json"',
        },
        body: exportBody,
      });
    });

    await page.goto('/settings');
    await page.getByTestId('settings-export').click();
    await expect(page.getByText(/Downloaded calisthenics-tree-export-/)).toBeVisible();
  });
});

test.describe('sign-out', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthedSession(page);
  });

  test('clicking sign-out navigates to /login', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('settings-sign-out').click();
    await expect(page).toHaveURL(/\/login/);
  });
});