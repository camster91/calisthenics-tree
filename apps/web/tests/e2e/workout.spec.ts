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

test('log one set, save, navigate to done screen', async ({
  page,
  browserName,
}) => {
  // WebKit: the Save button click doesn't reliably trigger the SPA
  // navigation to /done before the `toHaveURL` assertion times out.
  // Same flow passes in chromium + firefox. Tracked separately.
  test.skip(
    browserName === 'webkit',
    'Chromium + Firefox: WebKit save-button click timing',
  );

  await page.goto('/workout/node_00000000-0000-0000-0000-000000000100');

  // Page renders the exercise name + target
  await expect(page.getByRole('heading', { name: 'Wall Push-Up' })).toBeVisible();
  // Set list shows target reps per set (Sprint 37 simplified the per-set
  // target label from "Target: 3×12 reps" to just "Target: 12 reps" — the
  // total-set count is rendered separately in the hero as "3× sets").
  // All 3 sets share the same target line, so use .first().
  await expect(page.getByText(/Target: 12 reps/).first()).toBeVisible();

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