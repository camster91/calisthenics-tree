/**
 * /welcome happy path.
 */
import { test, expect } from '@playwright/test';

test('/welcome renders the marketing hero + CTA', async ({ page }) => {
  await page.goto('/welcome');

  await expect(
    page.getByRole('heading', { level: 1, name: /calisthenics/i }),
  ).toBeVisible();

  // CTAs present
  await expect(
    page.getByRole('link', { name: /get started/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /i have an account/i }),
  ).toBeVisible();

  // Privacy + Terms in footer
  await expect(
    page.getByRole('link', { name: /privacy/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /terms/i }),
  ).toBeVisible();
});

test('"Get started" links to /onboarding/q1', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('link', { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/q1/);
});

test('"I have an account" links to /login', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('link', { name: /i have an account/i }).click();
  await expect(page).toHaveURL(/\/login/);
});