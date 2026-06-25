/**
 * /workout/:nodeId happy path — log sets, save, land on done screen.
 */
import { test, expect } from '@playwright/test';

import {
  seedAuthedSession,
  mockRoutes,
  SAMPLE_NODE_DETAIL,
} from './_helpers';

test.beforeEach(async ({ page }) => {
  await seedAuthedSession(page);
  await mockRoutes(page, [
    {
      method: 'GET',
      path: /\/api\/v1\/nodes\/node_/,
      body: SAMPLE_NODE_DETAIL,
    },
    {
      method: 'POST',
      path: /\/api\/v1\/workouts\/sync/,
      body: {
        status: 'success',
        synced_workout_count: 1,
        state_updates: { promotions: [], regressions: [] },
      },
    },
  ]);
});

test('log one set, save, navigate to done screen', async ({ page }) => {
  await page.goto('/workout/node_00000000-0000-0000-0000-000000000100');

  // Page renders the exercise name + target
  await expect(page.getByRole('heading', { name: 'Wall Push-Up' })).toBeVisible();
  await expect(page.getByText(/Target: 3×12 reps/)).toBeVisible();

  // Mark first set complete (avoids dealing with RepCounter internals)
  await page.getByTestId('workout-set-toggle-0').click();

  // Save
  await page.getByTestId('workout-save').click();
  await expect(page).toHaveURL(/\/workout\/node_.*\/done/);

  // Done page shows
  await expect(page.getByTestId('workout-done')).toBeVisible();
});

test('Save button is disabled until at least one set is marked complete', async ({
  page,
}) => {
  await page.goto('/workout/node_00000000-0000-0000-0000-000000000100');
  const saveBtn = page.getByTestId('workout-save');
  await expect(saveBtn).toBeDisabled();
});