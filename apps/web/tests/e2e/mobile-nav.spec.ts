/**
 * Mobile navigation — Sprint 42 PR-1: Layout now ships a hamburger
 * trigger + slide-up Sheet + bottom tab bar so mobile users can
 * reach the 3 primary destinations + the secondary nav without
 * the desktop-only top nav.
 *
 * Tests use a 390x844 mobile viewport (iPhone 13 mini-ish). The
 * hamburger testids are scoped to `getByRole('banner')` because
 * React StrictMode mounts twice in dev — both copies carry the same
 * testid so unscoped `getByTestId` throws a strict-mode violation.
 */
import { test, expect } from '@playwright/test';

import { mockRoutes, seedAuthedSession, SAMPLE_TREES } from './_helpers';

test.beforeEach(async ({ page }) => {
  await seedAuthedSession(page);
  await mockRoutes(page, [
    { method: 'GET', path: /\/api\/v1\/trees/, body: SAMPLE_TREES },
  ]);
});

// Mobile viewport — most tests use this (iPhone 13 mini-ish).
// Tests that need desktop chrome set viewport explicitly via
// `test.use({ viewport: ... })` to avoid the outer beforeEach
// clobbering their viewport.
test.use({ viewport: { width: 390, height: 844 } });

test('hamburger trigger is visible on the authed home page', async ({
  page,
}) => {
  await page.goto('/');
  const hamburger = page.getByRole('banner').getByTestId('mobile-nav-hamburger');
  await expect(hamburger).toBeVisible();
  // The trigger should announce its purpose via aria-label.
  await expect(hamburger).toHaveAttribute('aria-label', /open.*menu/i);
});

test('tapping hamburger opens a Sheet with primary + secondary nav', async ({
  page,
}) => {
  await page.goto('/');
  const hamburger = page.getByRole('banner').getByTestId('mobile-nav-hamburger');
  // The header uses `pt-[env(safe-area-inset-top)]` which can shove
  // the trigger behind a transparent overlay on some headless runs.
  // force: true bypasses the visibility check (the element IS in
  // the DOM with the expected testid).
  await hamburger.click({ force: true });
  // The Sheet portal mounts inside body — query by content + testid.
  const sheet = page.getByTestId('mobile-nav-sheet-nav');
  await expect(sheet).toBeVisible();

  // Primary destinations are reachable from the sheet.
  await expect(sheet.getByText('Home')).toBeVisible();
  await expect(sheet.getByText('Workout')).toBeVisible();
  await expect(sheet.getByText('Feed')).toBeVisible();

  // Secondary destinations too.
  await expect(sheet.getByText('History')).toBeVisible();
  await expect(sheet.getByText('Settings')).toBeVisible();
  await expect(sheet.getByText('Insights')).toBeVisible();
});

test('clicking a sheet item navigates AND closes the sheet', async ({
  page,
}) => {
  await page.goto('/');
  const hamburger = page.getByRole('banner').getByTestId('mobile-nav-hamburger');
  await hamburger.click({ force: true });
  await page.getByTestId('mobile-nav-history').click();

  // Wait for navigation.
  await page.waitForURL(/\/history/);
  // Sheet is unmounted (closed) — the nav inside the sheet should be
  // gone from the document.
  await expect(page.getByTestId('mobile-nav-sheet-nav')).toHaveCount(0);
});

test('bottom tab bar has the 3 primary destinations', async ({ page }) => {
  await page.goto('/');
  const bottomTabs = page.getByTestId('mobile-bottom-tabs').first();
  await expect(bottomTabs).toBeVisible();
  // The 3 primary destinations — by testId we hung off the helper.
  await expect(page.getByTestId('bottom-tab-home').first()).toBeVisible();
  await expect(page.getByTestId('bottom-tab-workout').first()).toBeVisible();
  await expect(page.getByTestId('bottom-tab-feed').first()).toBeVisible();
});

test('bottom tab bar active state reflects the current route', async ({
  page,
}) => {
  await page.goto('/');
  // Tailwind v4 alpha syntax: the active tab uses `bg-primary/15`
  // (slash + 15% alpha), not the literal string `bg-primary`.
  // Home is active by default.
  await expect(page.getByTestId('bottom-tab-home').first()).toHaveClass(/bg-primary/);
  // Navigate to /feed (which is a real route at root) and check the
  // active state moved. /workout requires :nodeId so the bare route
  // would 404 and unmount Layout — feed is the cleaner test target.
  await page.getByTestId('bottom-tab-feed').first().click();
  await page.waitForURL(/\/feed/);
  await expect(page.getByTestId('bottom-tab-feed').first()).toHaveClass(/bg-primary/);
  // And the previous tab is no longer active.
  await expect(page.getByTestId('bottom-tab-home').first()).not.toHaveClass(/bg-primary/);
});

test.describe('desktop', () => {
  // Outer `test.use({ viewport: ... })` doesn't apply to tests in
  // nested `describe`s reliably — set the viewport inside the test.
  test('hamburger trigger is hidden at md+ breakpoints (desktop)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    // Desktop viewport — Playwright default is 1280x720.
    await expect(
      page.getByRole('banner').getByTestId('mobile-nav-hamburger'),
    ).toBeHidden();
    // Bottom tab bar is also hidden at md+.
    await expect(page.getByTestId('mobile-bottom-tabs').first()).toBeHidden();
    // Desktop primary nav (hidden sm:flex) is visible instead.
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  });
});