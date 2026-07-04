/**
 * 404 catch-all — Sprint 42 PR-2: public NotFoundPage mounts as the
 * last route in the public routes block. Any unknown URL (typed by
 * a user or broken link) should land on this page with deep-links
 * to the 4 trees + search, NOT a blank white screen.
 */
import { test, expect } from '@playwright/test';

test('unknown URL renders the public 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist-12345');

  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible();
  // The body should mention the bad URL so users see what we tried.
  await expect(
    page.getByText('/this-route-does-not-exist-12345', { exact: false }),
  ).toBeVisible();
});

test('public 404 page has 4 tree deep-links', async ({ page }) => {
  await page.goto('/totally-not-a-route');

  // Tree CTAs — Sprint 42 deep-links.
  const push = page.getByRole('link', { name: /push/i }).first();
  const pull = page.getByRole('link', { name: /pull/i }).first();
  const core = page.getByRole('link', { name: /core/i }).first();
  const legs = page.getByRole('link', { name: /legs/i }).first();

  await expect(push).toBeVisible();
  await expect(pull).toBeVisible();
  await expect(core).toBeVisible();
  await expect(legs).toBeVisible();

  // Clicking Push should route to /tree/push (the authed app's tree browser).
  await push.click();
  await expect(page).toHaveURL(/\/tree\/push/);
});

test('public 404 has a Back to home CTA', async ({ page }) => {
  await page.goto('/yet-another-missing-route');

  const homeCta = page.getByRole('link', { name: /back to home/i }).first();
  await expect(homeCta).toBeVisible();

  // CTA goes to "/" (authed HomePage or public LandingPage depending
  // on auth state — for an unauthed test we go to LandingPage via /welcome).
  await homeCta.click();
  // /welcome is the public landing; if the user is authed it'd be /
  // Either is acceptable — just confirm we left the 404 page.
  await expect(page).not.toHaveURL(/\/yet-another-missing-route/);
});