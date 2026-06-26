/**
 * Pricing / paywall — now a "free during early access" notice.
 *
 * During early access /pricing just shows the launch message; there's
 * no paid-tier surface to test. The paywall spec (deleted) used to
 * verify the 5-friend-limit → PaywallDialog round-trip; both the limit
 * and the dialog wiring were removed in Sprint 21.
 *
 * What this spec covers:
 *  - /pricing renders the "free" notice for anonymous visitors
 *  - Authed free user sees their tier badge ("Free")
 *  - No "Choose monthly" / "Choose yearly" CTAs anywhere
 */

import { test, expect } from '@playwright/test';

import {
  mockRoutes,
  seedAuthedSession,
} from './_helpers';

const FREE_BILLING = {
  tier: 'free',
  provider: null,
  started_at: null,
  expires_at: null,
  cancel_at: null,
};

const ME_RESPONSE = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'e2e@example.com',
  display_name: null,
  created_at: new Date().toISOString(),
};

test.describe('Pricing page — free during early access', () => {
  test('anonymous visitor sees the free notice', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByTestId('pricing-free-notice')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /free during early access/i }),
    ).toBeVisible();

    // No paid-plan CTAs anywhere on the page.
    await expect(
      page.getByRole('button', { name: /choose monthly/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /choose yearly/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /choose lifetime/i }),
    ).toHaveCount(0);
  });

  test('authed free user sees Free badge on the page', async ({ page }) => {
    await seedAuthedSession(page);
    await mockRoutes(page, [
      { method: 'GET', path: /\/billing\/me$/, body: FREE_BILLING },
      { method: 'GET', path: /\/users\/me$/, body: ME_RESPONSE },
      { method: 'PATCH', path: /\/users\/me$/, body: ME_RESPONSE },
    ]);

    await page.goto('/pricing');
    await expect(page.getByTestId('pricing-free-notice')).toBeVisible();
    await expect(page.getByTestId('current-tier-badge')).toContainText(/free/i);
  });

  test('Settings subscription section shows Free with no Upgrade CTA', async ({
    page,
  }) => {
    await seedAuthedSession(page);
    await mockRoutes(page, [
      { method: 'GET', path: /\/billing\/me$/, body: FREE_BILLING },
      { method: 'GET', path: /\/users\/me$/, body: ME_RESPONSE },
      { method: 'PATCH', path: /\/users\/me$/, body: ME_RESPONSE },
    ]);

    await page.goto('/settings');
    await expect(page.getByTestId('subscription-section')).toBeVisible();
    await expect(page.getByTestId('settings-current-tier')).toContainText(/free/i);

    // No upgrade / cancel CTAs during early access.
    await expect(
      page.getByRole('button', { name: /upgrade to pro/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /cancel subscription/i }),
    ).toHaveCount(0);
  });
});