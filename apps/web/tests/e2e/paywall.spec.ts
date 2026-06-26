/**
 * Paywall round-trip — free-tier friend limit surfaces PaywallDialog.
 *
 * Closes the loop on Sprints 16/17/19:
 *   - Sprint 16 wired the backend billing contract + 402 headers
 *   - Sprint 17 wired the frontend paywall surface
 *   - Sprint 19 added the 5-friend limit on POST /api/v1/friends
 *
 * This spec verifies that when a free user hits the friend limit,
 * the ProfilePage opens the PaywallDialog instead of just an inline
 * error. The user sees an obvious upgrade path.
 */

import { test, expect } from '@playwright/test';

import {
  SAMPLE_AUTH,
  SAMPLE_ONBOARDING,
  seedAuthedSession,
} from './_helpers';

const FREE_FRIENDS = {
  items: [
    // 5 friends already in the list — the user is at the limit.
    {
      user_id: 'usr_11111111-1111-1111-1111-111111111111',
      email: 'a@example.com',
      display_name: 'Alice',
      followed_at: new Date().toISOString(),
    },
    {
      user_id: 'usr_22222222-2222-2222-2222-222222222222',
      email: 'b@example.com',
      display_name: 'Bob',
      followed_at: new Date().toISOString(),
    },
    {
      user_id: 'usr_33333333-3333-3333-3333-333333333333',
      email: 'c@example.com',
      display_name: 'Carol',
      followed_at: new Date().toISOString(),
    },
    {
      user_id: 'usr_44444444-4444-4444-4444-444444444444',
      email: 'd@example.com',
      display_name: 'Dave',
      followed_at: new Date().toISOString(),
    },
    {
      user_id: 'usr_55555555-5555-5555-5555-555555555555',
      email: 'e@example.com',
      display_name: 'Eve',
      followed_at: new Date().toISOString(),
    },
  ],
};

const PUBLIC_PROFILE = {
  user_id: 'usr_99999999-9999-9999-9999-999999999999',
  email: 'newfriend@example.com',
  display_name: 'New Friend',
  current_nodes: [],
};

const EMPTY_UNLOCKS = { items: [] };

const FREE_BILLING = {
  tier: 'free',
  provider: null,
  started_at: null,
  expires_at: null,
  cancel_at: null,
};

/** Mock the route + everything ProfilePage needs. */
async function mockFriendsAtLimit(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = req.url().split('?')[0];
    const method = req.method();

    if (method === 'GET' && url.endsWith('/billing/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FREE_BILLING),
      });
    }
    if (method === 'GET' && url.endsWith('/billing/plans')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currency: 'USD',
          plans: [
            { tier: 'monthly', price_cents: 599, interval: 'month', features: [] },
            { tier: 'yearly', price_cents: 2999, interval: 'year', features: [] },
            { tier: 'lifetime', price_cents: 9900, interval: 'one_time', features: [] },
          ],
        }),
      });
    }
    if (method === 'GET' && /\/users\/usr_[a-f0-9-]+$/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PUBLIC_PROFILE),
      });
    }
    if (method === 'GET' && /\/users\/usr_[a-f0-9-]+\/unlocks/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_UNLOCKS),
      });
    }
    if (method === 'GET' && url.endsWith('/friends')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FREE_FRIENDS),
      });
    }
    if (method === 'POST' && url.endsWith('/friends')) {
      // Mock the 402 the backend would return when free user hits limit.
      return route.fulfill({
        status: 402,
        contentType: 'application/json',
        headers: {
          'X-Required-Tier': 'monthly',
          'X-Current-Tier': 'free',
          'X-Friend-Limit': '5',
        },
        body: JSON.stringify({
          detail:
            'Free accounts can follow up to 5 friends. Upgrade to Pro for unlimited friends + the social feed.',
        }),
      });
    }
    return route.fulfill({ status: 404, body: 'mocked: no handler' });
  });
}

test.describe('Paywall round-trip (Sprints 16/17/19)', () => {
  test('free user at friend limit sees PaywallDialog on follow attempt', async ({
    page,
  }) => {
    await seedAuthedSession(page);
    await mockFriendsAtLimit(page);

    await page.goto('/u/usr_99999999-9999-9999-9999-999999999999');
    await expect(page.getByTestId('profile-page')).toBeVisible();

    // Click the Follow button — backend returns 402.
    await page.getByTestId('profile-follow-toggle').click();

    // PaywallDialog opens with the right feature name + backend detail.
    const dialog = page.getByTestId('paywall-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/unlimited friends/i);
    await expect(dialog).toContainText(/up to 5 friends/i);

    // The "See plans" CTA routes to /pricing.
    await dialog.getByRole('button', { name: /see plans/i }).click();
    await expect(page).toHaveURL(/\/pricing$/);
  });
});