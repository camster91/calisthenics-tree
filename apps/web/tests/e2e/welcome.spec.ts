/**
 * /welcome happy path.
 */
import { test, expect } from '@playwright/test';

test('/welcome renders the marketing hero + CTA', async ({ page }) => {
  await page.goto('/welcome');

  await expect(
    page.getByRole('heading', { level: 1, name: /earn every skill/i }),
  ).toBeVisible();

  // CTAs present
  await expect(
    page.getByRole('link', { name: /find your level/i }),
  ).toBeVisible();
  await expect(page.getByTestId('welcome-signin')).toBeVisible();

  // Accurate catalogue size (4 trees x 10 ranks)
  await expect(page.getByText(/40 skill nodes across 4 trees/i)).toBeVisible();

  // Privacy + Terms in footer
  await expect(
    page.getByRole('link', { name: /privacy/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /terms/i }),
  ).toBeVisible();
});

test('"Find your level" links to /onboarding/q1', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('link', { name: /find your level/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/q1/);
});

test('"Sign in" links to /login', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByTestId('welcome-signin').click();
  await expect(page).toHaveURL(/\/login/);
});
