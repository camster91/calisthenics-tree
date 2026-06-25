/**
 * Shared helpers for the E2E happy-path suite.
 *
 * These tests mock the backend API (page.route) so they run without
 * a live Postgres. Mocked routes live in `mockRoutes()` — extend as
 * new flows are added.
 */
import { Page, Route } from '@playwright/test';

/**
 * Seed localStorage with an authed + onboarded session so the route
 * guards let us past RequireAuth + RequireOnboarded.
 */
export const SAMPLE_AUTH = {
  status: 'authenticated' as const,
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'e2e@example.com',
    created_at: new Date().toISOString(),
  },
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  accessExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
};

export const SAMPLE_ONBOARDING = {
  answers: {
    can_pull_up: true,
    support_hold_15s: false,
    active_hang_10s: null,
    rir2_pushup_reps: 8,
  },
  result: null,
};

export async function seedAuthedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ auth, onboarding }) => {
      // Use a sessionStorage flag to gate the seed: prevents re-seeding
      // AFTER sign-out clears localStorage (which is the exact thing the
      // sign-out test is verifying).
      try {
        if (!sessionStorage.getItem('__e2e_seeded')) {
          window.localStorage.setItem('ct:auth', JSON.stringify(auth));
          window.localStorage.setItem(
            'ct:onboarding',
            JSON.stringify(onboarding),
          );
          sessionStorage.setItem('__e2e_seeded', '1');
        }
      } catch {
        /* private mode */
      }
    },
    { auth: SAMPLE_AUTH, onboarding: SAMPLE_ONBOARDING },
  );
}

/**
 * Mock the /api/v1/* routes the E2E suite touches. Each test extends
 * this with its own page.route handlers.
 */
export async function mockRoutes(
  page: Page,
  handlers: Array<{ method: string; path: RegExp; body: unknown }>,
): Promise<void> {
  await page.route('**/api/v1/**', async (route: Route) => {
    const req = route.request();
    const url = req.url();
    // Strip query string for matching — the route pattern shouldn't
    // need to anticipate ?limit=20 etc.
    const urlNoQuery = url.split('?')[0];
    for (const h of handlers) {
      if (req.method() === h.method && h.path.test(urlNoQuery)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(h.body),
        });
      }
    }
    // Default: 404 for unmatched /api/v1 calls.
    return route.fulfill({ status: 404, body: 'mocked: no handler' });
  });
}

export const SAMPLE_PROGRESSIONS = {
  user_id: 'usr_00000000-0000-0000-0000-000000000001',
  updated_at: new Date().toISOString(),
  active_progressions: [
    {
      tree_id: 'tree_00000000-0000-0000-0000-000000000010',
      tree_name: 'Vertical Push',
      current_node: {
        node_id: 'node_00000000-0000-0000-0000-000000000100',
        exercise_name: 'Wall Push-Up',
        movement_type: 'isotonic' as const,
        target_sets: 3,
        target_reps: 12,
        target_hold_secs: null,
      },
    },
    {
      tree_id: 'tree_00000000-0000-0000-0000-000000000020',
      tree_name: 'Horizontal Pull',
      current_node: {
        node_id: 'node_00000000-0000-0000-0000-000000000200',
        exercise_name: 'Dead Hang',
        movement_type: 'isometric' as const,
        target_sets: 3,
        target_reps: null,
        target_hold_secs: 30,
      },
    },
    {
      tree_id: 'tree_00000000-0000-0000-0000-000000000030',
      tree_name: 'Core',
      current_node: {
        node_id: 'node_00000000-0000-0000-0000-000000000300',
        exercise_name: 'Plank',
        movement_type: 'isometric' as const,
        target_sets: 3,
        target_reps: null,
        target_hold_secs: 60,
      },
    },
  ],
};

export const SAMPLE_TREES = {
  trees: [
    {
      tree_id: 'tree_00000000-0000-0000-0000-000000000010',
      slug: 'push_handstand_pushup_path',
      name: 'Vertical Push',
      description: 'From wall push-ups to handstand push-ups.',
      nodes: [
        {
          node_id: 'node_00000000-0000-0000-0000-000000000100',
          name: 'Wall Push-Up',
          movement_type: 'isotonic' as const,
          rank_level: 1,
          target_sets: 3,
          target_reps: 12,
          target_hold_secs: null,
        },
        {
          node_id: 'node_00000000-0000-0000-0000-000000000110',
          name: 'Incline Push-Up',
          movement_type: 'isotonic' as const,
          rank_level: 2,
          target_sets: 3,
          target_reps: 10,
          target_hold_secs: null,
        },
      ],
      edges: [],
    },
  ],
};

export const SAMPLE_NODE_DETAIL = {
  node_id: 'node_00000000-0000-0000-0000-000000000100',
  exercise_name: 'Wall Push-Up',
  movement_type: 'isotonic' as const,
  target_sets: 3,
  target_reps: 12,
  target_hold_secs: null,
};

export const SAMPLE_FEED = {
  items: [
    {
      id: 'unlock_11111111-1111-1111-1111-111111111111',
      user: {
        id: 'usr_00000000-0000-0000-0000-000000000001',
        email: 'e2e@example.com',
        display_name: 'E2E Tester',
      },
      tree_id: 'tree_00000000-0000-0000-0000-000000000010',
      tree_name: 'Vertical Push',
      new_node_id: 'node_00000000-0000-0000-0000-000000000110',
      new_node_name: 'Incline Push-Up',
      trigger: 'PROMOTION' as const,
      note: 'All target sets met on latest workout session.',
      occurred_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ],
};