/**
 * Pricing / paywall happy path — covers P5 scaffold surface.
 *
 * Scenarios:
 *  - /pricing renders for anonymous visitors (no auth gate)
 *  - Authed free user sees their tier badge + Upgrade button
 *  - Checkout click against mocked 503 shows the "not configured" notice
 *  - Settings page renders the Subscription section with the current tier
 *
 * Uses the existing page.route mocking pattern — no live backend needed.
 */

import { test, expect } from '@playwright/test';

import {
  mockRoutes,
  SAMPLE_AUTH,
  SAMPLE_ONBOARDING,
  seedAuthedSession,
} from './_helpers';

const FREE_BILLING_STATUS = {
  tier: 'free',
  provider: null,
  started_at: null,
  expires_at: null,
  cancel_at: null,
};

const PLANS = {
  currency: 'USD',
  plans: [
    {
      tier: 'monthly',
      price_cents: 599,
      interval: 'month',
      features: ['Unlimited workouts', 'Full DAG visualization', 'Personalized placement'],
    },
    {
      tier: 'yearly',
      price_cents: 2999,
      interval: 'year',
      features: ['Everything in monthly', 'Two months free vs monthly'],
    },
    {
      tier: 'lifetime',
      price_cents: 9900,
      interval: 'one_time',
      features: ['Everything in yearly', 'One-time payment', 'Founders badge'],
    },
  ],
};

const ME_RESPONSE = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'e2e@example.com',
  display_name: null,
  created_at: new Date().toISOString(),
};

/** Mock every /api/v1/* call the pricing + settings flow needs. */
async function mockBillingRoutes(
  page: import('@playwright/test').Page,
  billingStatus = FREE_BILLING_STATUS,
) {
  await mockRoutes(page, [
    { method: 'GET', path: /\/billing\/plans$/, body: PLANS },
    { method: 'GET', path: /\/billing\/me$/, body: billingStatus },
    { method: 'GET', path: /\/users\/me$/, body: ME_RESPONSE },
    { method: 'PATCH', path: /\/users\/me$/, body: ME_RESPONSE },
    {
      method: 'POST',
      path: /\/billing\/checkout$/,
      body: {
        checkout_url: '',
        external_session_id: '',
        provider_configured: false,
      },
      // Status 503 — matches the backend's NullProvider response so the
      // "not configured" error banner is exercised end-to-end.
      status: 503,
    } as any,
  ]);
}

test.describe('Pricing page (P5 scaffold)', () => {
  test('renders anonymously and shows all three plans', async ({ page }) => {
    await mockRoutes(page, [
      { method: 'GET', path: /\/billing\/plans$/, body: PLANS },
    ]);

    await page.goto('/pricing');
    await expect(
      page.getByRole('heading', { name: /train smarter with pro/i }),
    ).toBeVisible();
    await expect(page.getByTestId('plan-monthly')).toBeVisible();
    await expect(page.getByTestId('plan-yearly')).toBeVisible();
    await expect(page.getByTestId('plan-lifetime')).toBeVisible();

    // "Sign in to choose" copy for anonymous visitors on each plan card.
    await expect(
      page.getByTestId('plan-monthly').getByRole('button', { name: /sign in/i }),
    ).toBeVisible();
  });

  test('shows "coming soon" banner when checkout returns 503 (NullProvider)', async ({
    page,
  }) => {
    await seedAuthedSession(page);
    await mockBillingRoutes(page);

    await page.goto('/pricing');
    await expect(page.getByTestId('plan-monthly')).toBeVisible();

    // Click monthly → checkout 503 → error banner surfaces.
    await page
      .getByTestId('plan-monthly')
      .getByRole('button', { name: /choose monthly/i })
      .click();
    await expect(page.getByTestId('checkout-error')).toBeVisible();
    await expect(page.getByTestId('checkout-error')).toContainText(
      /payments are not configured/i,
    );
  });

  test('free user sees Free tier badge and Upgrade CTA on each plan', async ({
    page,
  }) => {
    await seedAuthedSession(page);
    await mockBillingRoutes(page);

    await page.goto('/pricing');
    await expect(page.getByTestId('current-tier-badge')).toContainText(/free/i);
    await expect(
      page.getByTestId('plan-yearly').getByRole('button', { name: /choose yearly/i }),
    ).toBeVisible();
  });
});

test.describe('Settings — subscription section', () => {
  test('free user sees Upgrade button', async ({ page }) => {
    await seedAuthedSession(page);
    await mockBillingRoutes(page);

    await page.goto('/settings');
    await expect(page.getByTestId('subscription-section')).toBeVisible();
    await expect(page.getByTestId('settings-current-tier')).toContainText(/free/i);
    await expect(
      page.getByTestId('subscription-section').getByRole('button', {
        name: /upgrade to pro/i,
      }),
    ).toBeVisible();
  });

  test('paid user sees Cancel button, no Upgrade', async ({ page }) => {
    await seedAuthedSession(page);
    await mockBillingRoutes(page, {
      tier: 'monthly',
      provider: 'stripe',
      started_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancel_at: null,
    });

    await page.goto('/settings');
    await expect(page.getByTestId('settings-current-tier')).toContainText(/monthly/i);
    await expect(
      page.getByTestId('subscription-section').getByRole('button', {
        name: /cancel subscription/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId('subscription-section').getByRole('button', {
        name: /upgrade to pro/i,
      }),
    ).toHaveCount(0);
  });
});