/**
 * SEO landing pages — /learn/:slug renders + calculator works.
 */
import { test, expect } from '@playwright/test';

import { mockRoutes, SAMPLE_TREES } from './_helpers';

test.beforeEach(async ({ page }) => {
  // The /learn/:slug page hits GET /api/v1/trees (unauth) to build the
  // slug → node map.
  await mockRoutes(page, [
    { method: 'GET', path: /\/api\/v1\/trees/, body: SAMPLE_TREES },
  ]);
});

test('/learn/<slug> renders hero + calculator', async ({ page }) => {
  await page.goto('/learn/push_handstand_pushup_path-r1-wall-push-up');

  await expect(
    page.getByRole('heading', { name: 'Wall Push-Up' }),
  ).toBeVisible();
  await expect(page.getByText(/vertical push/i).first()).toBeVisible();
  await expect(page.getByTestId('calc-input')).toBeVisible();
  await expect(page.getByTestId('node-landing-cta')).toBeVisible();
});

test('calculator returns "ready" when within 2 of target', async ({ page }) => {
  await page.goto('/learn/push_handstand_pushup_path-r1-wall-push-up');
  // Target = 12 reps; enter 11 → within 2 → "ready"
  await page.getByTestId('calc-input').fill('11');
  await page.getByRole('button', { name: /check/i }).click();
  await expect(page.getByText(/you're ready/i)).toBeVisible();
});

test('CTA deep-links to onboarding with node ref', async ({ page }) => {
  await page.goto('/learn/push_handstand_pushup_path-r1-wall-push-up');
  const cta = page.getByTestId('node-landing-cta');
  await expect(cta).toHaveAttribute(
    'href',
    /\/onboarding\/q1\?ref=node_/,
  );
});