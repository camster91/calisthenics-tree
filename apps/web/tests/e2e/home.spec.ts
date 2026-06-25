/**
 * Home page happy path (authed + onboarded session).
 */
import { test, expect } from '@playwright/test';

import {
  seedAuthedSession,
  mockRoutes,
  SAMPLE_PROGRESSIONS,
  SAMPLE_TREES,
} from './_helpers';

test.beforeEach(async ({ page }) => {
  await seedAuthedSession(page);
  await mockRoutes(page, [
    { method: 'GET', path: /\/api\/v1\/healthz/, body: { status: 'ok' } },
    { method: 'GET', path: /\/api\/v1\/users\/me\/progressions/, body: SAMPLE_PROGRESSIONS },
    { method: 'GET', path: /\/api\/v1\/trees/, body: SAMPLE_TREES },
  ]);
});

test('home shows the three progression cards', async ({ page }) => {
  await page.goto('/');

  // Backend status ok
  await expect(page.getByText('/healthz →')).toBeVisible();

  // Three tree names rendered
  await expect(page.getByRole('heading', { name: 'Vertical Push' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Horizontal Pull' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Core' })).toBeVisible();

  // Current nodes visible
  await expect(page.getByText('Wall Push-Up')).toBeVisible();
  await expect(page.getByText('Dead Hang')).toBeVisible();
  await expect(page.getByText('Plank')).toBeVisible();
});

test('"Start workout" CTA navigates to /workout/:nodeId', async ({ page }) => {
  await page.goto('/');
  // First card's Start workout button
  const startButtons = page.getByRole('link', { name: /start workout/i });
  await expect(startButtons.first()).toBeVisible();
  await startButtons.first().click();
  await expect(page).toHaveURL(/\/workout\/node_/);
});

test('"View full tree" links to /tree/:treeId', async ({ page }) => {
  await page.goto('/');
  const viewLinks = page.getByRole('link', { name: /view full tree/i });
  await expect(viewLinks.first()).toBeVisible();
  await viewLinks.first().click();
  await expect(page).toHaveURL(/\/tree\/tree_/);
});