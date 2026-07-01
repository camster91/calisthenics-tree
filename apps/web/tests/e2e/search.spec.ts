/** T40 — search e2e tests.
 *
 * Exercises the /search page + the header search bar that
 * Layout.tsx renders. Public endpoint, no auth required for
 * node/exercise results.
 */

import { test, expect } from '@playwright/test';
import { mockRoutes, seedAuthedSession } from './_helpers';

test.describe('search (Sprint 40)', () => {
  test('empty /search shows idle state', async ({ page }) => {
    await mockRoutes(page);
    await page.goto('/search');
    await expect(page.getByTestId('search-page')).toBeVisible();
    await expect(page.getByText(/start typing to search/i)).toBeVisible();
  });

  test('typing a query surfaces node + exercise results', async ({ page }) => {
    // The seed data has 30 nodes — "push" is guaranteed to match
    // at least a few (push-up, handstand push-up, etc.) and the
    // exercise "Push-Up" is in the seed list. We mock the api
    // response with two synthetic results so this test doesn't
    // depend on the exact seed ordering.
    await mockRoutes(page, [
      {
        method: 'GET',
        path: /\/api\/v1\/search(\?|$)/,
        body: {
          query: 'push',
          nodes: [
            {
              kind: 'node',
              id: 'node_p1',
              name: 'Push-Up',
              breadcrumb: 'Vertical Push · rank 1',
            },
          ],
          exercises: [
            {
              kind: 'exercise',
              id: 'ex_pushup',
              name: 'Standard Push-Up',
              breadcrumb: 'isotonic',
            },
          ],
          users: [],
        },
      },
    ]);
    await page.goto('/search');
    await page.getByTestId('search-input').fill('push');
    // Debounce is 300ms; wait for the results to render.
    await expect(page.getByTestId('search-result-node')).toBeVisible();
    await expect(page.getByTestId('search-result-exercise')).toBeVisible();
    // Groups are labelled — use the group h2's aria-labelledby to be
    // unambiguous (the literal word "Skills" also appears in the
    // header copy + on the result kind badge).
    await expect(page.locator('#search-group-node')).toHaveText('Skills');
    await expect(page.locator('#search-group-exercise')).toHaveText('Exercises');
  });

  test('header search bar submits to /search?q=...', async ({ page }) => {
    await seedAuthedSession(page);
    await mockRoutes(page);
    await page.goto('/');
    await expect(page.getByTestId('header-search-input')).toBeVisible();
    await page.getByTestId('header-search-input').fill('handstand');
    await page.getByTestId('header-search-input').press('Enter');
    await expect(page).toHaveURL(/\/search\?q=handstand/);
  });
});