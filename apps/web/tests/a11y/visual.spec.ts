/**
 * Vision-check helper for the gym-glare toggle.
 *
 * Captures /settings in both default and gym-glare modes so the
 * reviewer can confirm the contrast change is visible. Run with:
 *   PLAYWRIGHT_BASE_URL=http://localhost:4173 npx playwright test tests/a11y/visual.spec.ts
 */
import { test, expect } from '@playwright/test';

test('settings: default vs gym-glare screenshots', async ({ page }) => {
  // Seed an authed+onboarded session so /settings doesn't redirect to /login.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('ct:auth', JSON.stringify({
        status: 'authenticated',
        user: { id: '00000000-0000-0000-0000-000000000001', email: 'a11y@example.com', created_at: new Date().toISOString() },
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        accessExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      }));
      window.localStorage.setItem('ct:onboarding', JSON.stringify({
        answers: {
          can_pull_up: true,
          support_hold_15s: false,
          active_hang_10s: null,
          rir2_pushup_reps: 8,
        },
        result: null,
      }));
    } catch {
      /* private mode */
    }
  });
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
  await page.screenshot({
    path: 'test-results/settings-default.png',
    fullPage: true,
  });

  // Flip the theme to gym-glare via the radiogroup's "Gym glare" option.
  const gymGlareRadio = page
    .getByRole('radiogroup', { name: /theme/i })
    .getByRole('radio', { name: /gym glare \(high contrast\)/i });
  await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'false');
  await gymGlareRadio.click();
  await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'true');

  // Give CSS variables a tick to apply
  await page.waitForTimeout(200);
  await page.screenshot({
    path: 'test-results/settings-gym-glare.png',
    fullPage: true,
  });
});