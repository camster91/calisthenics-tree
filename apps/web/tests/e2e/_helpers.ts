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
          // Sprint 38 RED-7: cache the user info so AuthProvider's
          // optimistic auth state fires from useState's initializer
          // instead of waiting on /auth/whoami. Tests run against a
          // mock, but we still want the optimistic path to match
          // production behavior.
          window.localStorage.setItem('ct:user', JSON.stringify(auth.user));
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
  const debug = process.env.E2E_DEBUG === '1';
  if (debug) {
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        // eslint-disable-next-line no-console
        console.log(`[page REQ] ${req.method()} ${req.url()}`);
      }
    });
    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        const ct = res.headers()['content-type'] || '';
        let bodyPreview = '';
        try {
          const body = await res.text();
          bodyPreview = body.slice(0, 60).replace(/\n/g, '\\n');
        } catch {}
        // eslint-disable-next-line no-console
        console.log(`[page RES] ${res.status()} ${ct} ${res.url()} body[0..60]=${JSON.stringify(bodyPreview)}`);
      }
    });
  }
  // Use page.context().route() instead of page.route(). Playwright's page-level
  // route has a quirk where after fulfilling a request, subsequent requests
  // for the same URL can bypass the handler and hit the real network (the
  // browser cache then locks in the first response — usually HTML from Vite
  // when the mock didn't fire for the very first request). Context-level
  // routing sidesteps this and matches every request consistently across the
  // test's full lifecycle (including navigation + StrictMode re-fetches).
  const ctx = page.context();
  await ctx.route('**/api/v1/**', async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const urlNoQuery = url.split('?')[0];
    for (const h of handlers) {
      if (req.method() === h.method && h.path.test(urlNoQuery)) {
        if (debug) console.log(`[mock HIT] ${req.method()} ${urlNoQuery}`);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(h.body),
        });
      }
    }
    if (debug) console.log(`[mock MISS] ${req.method()} ${urlNoQuery}`);
    return route.fulfill({ status: 404, body: 'mocked: no handler' });
  });

  // `getHealth()` does a bare `fetch('/healthz')` (no /api/v1 prefix) because
  // Caddy proxies it from the SPA host to the api container directly so the
  // backend's `/healthz` (mounted at root) is reachable in production without
  // the /api/v1 versioning. Tests run against Vite dev which has no proxy, so
  // we mock the bare path here to keep the page happy.
  await ctx.route('**/healthz', async (route: Route) => {
    const body = handlers
      .find((h) => /healthz/i.test(h.path.source))
      ?.body ?? { status: 'ok' };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
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