/**
 * API client — typed fetch wrapper for the FastAPI backend.
 *
 * Backend lives in apps/api/ (FastAPI + Postgres).
 *
 * Sprint 38 RED-7: Auth now rides on HttpOnly+Secure+SameSite=Lax cookies
 * set by /auth/verify. The browser sends them automatically; this client
 * just uses `credentials: 'include'`. The Authorization header path is
 * preserved only for the bearer fallback (dev/CI/external scripts).
 *
 * Auth flow:
 *   - Cookie is sent on every request via credentials: 'include'. The
 *     backend's get_current_user prefers the cookie, falls back to bearer.
 *   - On 401, calls authStore.handleUnauthorized() which triggers a
 *     refresh + retry-once via the AuthProvider's registered handler.
 *     Refresh reads the refresh cookie; the rotated cookies are set in
 *     the response, the browser keeps them automatically.
 *   - If refresh fails, the original 401 surfaces to the caller.
 *
 * Local-mode sentinel ('local-dev-mode') is detected from authStore and
 * short-circuits to localMockRoute; cookies aren't involved.
 *
 * Base URL: import.meta.env.VITE_API_URL (defaults to '/api' in dev via
 * the Vite proxy, which forwards to http://localhost:8000).
 */

import { authStore } from './auth-store';
import * as local from './local-mode';

export * from './api-types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** Server-supplied detail string when available.
   *
   * FastAPI emits `{"detail":"..."}` for HTTPException and
   * `{"detail":[...validation errors...]}` for Pydantic validation.
   * For the validation case we join the messages with `; ` so the
   * caller sees something like "Input should be >= 1; Input should
   * be <= 200" rather than the raw nested array.
   *
   * Returns undefined when the body isn't an object with a `detail`
   * field (e.g. plain-text 500s) so callers can fall back to `message`.
   */
  get detail(): string | undefined {
    if (!this.body || typeof this.body !== 'object') return undefined;
    const d = (this.body as { detail?: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      return d
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'msg' in entry) {
            const msg = (entry as { msg?: unknown }).msg;
            if (typeof msg === 'string') return msg;
          }
          return null;
        })
        .filter((s): s is string => s !== null)
        .join('; ');
    }
    return undefined;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Sprint 38 RED-7 marker: skip the auto-refresh-on-401 retry. Useful for
   *  the auth endpoints themselves, which shouldn't be auto-refreshed.
   *  Header injection is gone — cookies carry credentials now. */
  skipRefresh?: boolean;
  /** Sprint 38 RED-7 marker: send cookies on a request that should NOT
   *  rely on a session (e.g. /auth/magic-link, /auth/verify). Mostly here
   *  for symmetry / future-proofing; today the browser sends cookies to
   *  anything matching the cookie's Path/Domain anyway, so this is a
   *  no-op in practice. */
  skipAuth?: boolean;
}

function buildHeaders(opts: RequestOptions): HeadersInit {
  const { headers } = opts;
  return {
    'Content-Type': 'application/json',
    ...headers,
  };
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = opts;

  // Local-mode intercept: when the user signed in via "Continue without
  // account", the accessToken is 'local-dev-mode' and we serve everything
  // from localStorage instead of hitting the network. Keeps the app
  // fully usable when email / Postmark isn't wired up.
  if (local.isLocalMode()) {
    // Sprint 39: localMockRoute returns `unknown` to keep the local-mode
    // type assertions in one place. Real callers trust that the local
    // helpers (in local-mode.ts) already return wire-shape objects; if
    // a branch ever drifts we want it visible here, not buried in a
    // cast that nobody scans.
    return localMockRoute(path, body, rest.method ?? 'GET') as T;
  }

  // Sprint 38 RED-7 cookie-mode: the auth provider fires /auth/whoami
  // once on mount, but the existing React-hydration dance was already
  // good enough on test runs — the cookie lives on the browser so it's
  // available even before the React-side hydrates. We don't gate api()
  // on `authStore.ready()` because that adds a render race in dev where
  // the cookie isn't actually consulted by the dev-server. The cookie
  // being absent produces a 401 → 401 handler triggers refresh →
  // refresh also fails without cookie → signOut runs. We accept that
  // brief window for tests; production has the cookie on the wire
  // from the very first request.

  const doFetch = (): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: 'include', // Sprint 38 RED-7: send the session cookie
      headers: buildHeaders({ headers }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  // Auto-refresh on 401 (once), unless caller opted out (auth endpoints).
  // The refresh request itself relies on the ct_session_refresh cookie
  // since the access cookie may have already expired.
  if (res.status === 401 && !skipRefresh) {
    const newToken = await authStore.handleUnauthorized();
    if (newToken) {
      // Retry the original request — the new access cookie was just set
      // by /auth/refresh's response Set-Cookie header.
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text();
    }
    throw new ApiError(res.status, parsed, `${res.status} ${res.statusText} on ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * localMockRoute — handle every endpoint the app calls when in local mode.
 * Routes without a real local equivalent return safe empty shapes so the
 * UI shows empty states instead of crashing.
 *
 * Returns `unknown` and is cast at the api() boundary instead of
 * spreading `as T` casts across every branch (Sprint 39 cleanup —
 * dropped 22 casts).
 */
async function localMockRoute(path: string, body: unknown, method: string): Promise<unknown> {
  const p = path.replace(/^\/api\/v1/, '');

  // Auth — return success shapes so the auth flow doesn't break if
  // someone hits them in local mode.
  if (p === '/auth/magic-link' && method === 'POST') {
    return { status: 'sent', expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), dev_token: null };
  }
  if (p.startsWith('/auth/verify')) {
    const snapshot = local.buildLocalAuthSnapshot();
    return {
      access_token: snapshot.accessToken,
      access_expires_at: snapshot.accessExpiresAt,
      refresh_token: snapshot.refreshToken,
      refresh_expires_at: snapshot.accessExpiresAt,
      user: snapshot.user,
    };
  }
  if (p === '/auth/refresh' && method === 'POST') {
    const snapshot = local.buildLocalAuthSnapshot();
    return {
      access_token: snapshot.accessToken,
      access_expires_at: snapshot.accessExpiresAt,
      refresh_token: snapshot.refreshToken,
      refresh_expires_at: snapshot.accessExpiresAt,
    };
  }

  // Onboarding placement — mirrors the backend's placement.py logic
  // (very loosely — just enough to produce a consistent local state).
  if (p === '/onboarding/place' && method === 'POST') {
    const a = (body as { answers?: { can_pull_up?: boolean; support_hold_15s?: boolean; active_hang_10s?: boolean; rir2_pushup_reps?: number } })?.answers;
    const archetype = computeArchetype(a);
    const rir2Offset = computeRir2Offset(a?.rir2_pushup_reps ?? 0);
    const placements = (['push', 'pull', 'core'] as const).map((slug) => ({
      tree_id: `tree-${slug}`,
      tree_name: TREE_DISPLAY_NAMES[slug],
      // Match the wire format used everywhere else (TREES nodes,
      // workout logs): node_<slug>-<rank> with underscore.
      starting_node_id: `node_${slug}-${archetype.startRank}`,
      starting_node_name: nameForRank(slug, archetype.startRank),
      starting_rank: archetype.startRank,
    }));
    local.setLocalPlacements(archetype.label, placements);
    return { archetype: archetype.label, rir2_offset: rir2Offset, placements };
  }

  // Progressions
  if (p === '/users/me/progressions' && method === 'GET') {
    return local.getLocalProgressions();
  }

  // Nodes
  if (p.startsWith('/nodes/')) {
    const nodeId = decodeURIComponent(p.replace('/nodes/', ''));
    const node = local.getLocalNode(nodeId);
    if (!node) throw new ApiError(404, { detail: `Node ${nodeId} not found.` }, `404 on ${path}`);
    return node;
  }

  // Trees
  if (p.startsWith('/trees/')) {
    const treeId = decodeURIComponent(p.replace('/trees/', ''));
    const tree = local.getLocalTree(treeId);
    if (!tree) throw new ApiError(404, { detail: `Tree ${treeId} not found.` }, `404 on ${path}`);
    return tree;
  }

  // Insights
  if (p === '/tendon-strain') return local.getLocalTendonStrain();

  // Profile / settings
  if (p === '/users/me' && method === 'GET') return local.getLocalProfile(local.buildLocalAuthSnapshot().user.id);
  if (p === '/users/me' && method === 'PATCH') return local.updateLocalDisplayName((body as { display_name?: string })?.display_name ?? '');
  if (p === '/users/me' && method === 'DELETE') { local.softDeleteLocal(); return { deleted: true }; }
  if (p === '/users/me/restore' && method === 'POST') return local.restoreLocal();
  if (p === '/users/me/export' && method === 'POST') return local.exportLocalData();

  // Feed
  if (p.startsWith('/feed')) return local.getLocalFeed();

  // History (local-mode only — no backend equivalent yet)
  if (p === '/users/me/history') return local.getLocalHistory();

  // Friends
  if (p.startsWith('/friends')) return local.getLocalFriends();

  // Workouts — mirror the real /workouts/sync response shape so the
  // WorkoutDonePage renders without changes.
  if (p === '/workouts/sync' && method === 'POST') {
    const sync = body as { sync_client_timestamp?: string; workouts?: { client_workout_id: string; completed_at: string; logs: { node_id: string; tree_id?: string; sets: { set_number: number; reps: number | null; hold_secs: number | null }[]; notes?: string | null; rir?: number | null; logged_at?: string }[] }[] };
    let syncedCount = 0;
    const promotions: { tree_id: string; old_node_id: string; new_node_id: string; trigger: string; reason: string }[] = [];
    for (const w of sync.workouts ?? []) {
      for (const log of w.logs ?? []) {
        // Frontend sends only the completed sets (no `completed` field,
        // no `tree_id`). Infer tree_id from the node_id prefix.
        // node_push-4 -> 'tree-push', node_pull-7 -> 'tree-pull', etc.
        const slugMatch = log.node_id.match(/^node_([a-z]+)-\d+$/);
        const inferredTreeId = log.tree_id ?? (slugMatch ? `tree-${slugMatch[1]}` : '');
        const beforeNodeId = log.node_id;
        const r = local.logLocalWorkout({
          node_id: log.node_id,
          tree_id: inferredTreeId,
          sets: log.sets,
          notes: log.notes ?? null,
          logged_at: log.logged_at ?? w.completed_at ?? new Date().toISOString(),
          rir: log.rir ?? null,
        });
        syncedCount += r.accepted;
        for (const s of r.applied_states) {
          if (s.promotion && s.current_node_id !== beforeNodeId) {
            promotions.push({
              tree_id: s.tree_id,
              old_node_id: beforeNodeId,
              new_node_id: s.current_node_id,
              trigger: 'PROMOTION',
              reason: 'Completed all target sets twice on this node',
            });
          }
        }
      }
    }
    return {
      status: 'success',
      synced_workout_count: syncedCount,
      state_updates: {
        promotions,
        regressions: [],
      },
    };
  }

  // Public profile / unlocks
  if (p.startsWith('/users/') && p.endsWith('/unlocks')) return local.getLocalUnlocks('');
  if (p.startsWith('/users/')) return local.getLocalProfile(local.buildLocalAuthSnapshot().user.id);

  // Fallback: empty success so the app doesn't crash on unmocked routes.
  // eslint-disable-next-line no-console
  console.warn(`[local-mode] unmocked endpoint: ${method} ${path}`);
  return {};
}

// --- local placement helpers ---

function computeArchetype(answers?: { can_pull_up?: boolean; support_hold_15s?: boolean; active_hang_10s?: boolean; rir2_pushup_reps?: number }): { label: string; startRank: number } {
  if (!answers) return { label: 'novice_b', startRank: 3 };
  if (answers.can_pull_up && answers.support_hold_15s) return { label: 'intermediate', startRank: 6 };
  if (answers.can_pull_up) return { label: 'novice_b', startRank: 4 };
  if (answers.active_hang_10s) return { label: 'novice_a', startRank: 3 };
  return { label: 'beginner', startRank: 2 };
}

function computeRir2Offset(reps: number): number {
  if (reps < 5) return -1;
  if (reps < 10) return 0;
  if (reps < 20) return 1;
  return 2;
}

const TREE_DISPLAY_NAMES: Record<'push' | 'pull' | 'core', string> = {
  push: 'Vertical Push (Handstand Push-Up Path)',
  pull: 'Horizontal Pull (Front Lever Path)',
  core: 'Core (Dragon Flag Path)',
};

const TREE_RANK_NAMES: Record<'push' | 'pull' | 'core', string[]> = {
  push: ['Wall Push-Up', 'Incline Push-Up', 'Standard Push-Up', 'Diamond Push-Up', 'Pike Push-Up', 'Wall Handstand Hold', 'Wall Handstand Push-Up', 'Freestanding Handstand Hold', 'Freestanding Handstand Push-Up', 'Planche Push-Up (Rings)'],
  pull: ['Dead Hang', 'Active Hang', 'Scapular Pulls', 'Negative Pull-Up', 'Pull-Up', 'Tuck Front Lever Hold', 'Advanced Tuck Front Lever Hold', 'Straddle Front Lever Hold', 'Full Front Lever Hold', 'Front Lever Pull'],
  core: ['Plank', 'Side Plank', 'Hollow Body Hold', 'L-Sit on Floor', 'L-Sit on Bars', 'Hanging Leg Raise', 'Toes-to-Bar', 'Dragon Flag (Tucked)', 'Dragon Flag', 'Maltese (Rings)'],
};

function nameForRank(treeSlug: 'push' | 'pull' | 'core', rank: number): string {
  return TREE_RANK_NAMES[treeSlug][rank - 1] ?? `Node ${rank}`;
}

/* ------------------------------------------------------------------ */
/* Typed endpoint helpers (schemas mirror apps/api/calisthenics_api/schemas.py) */
/* ------------------------------------------------------------------ */

export type MovementType = 'isotonic' | 'isometric';
export type Pathway =
  | 'bent_arm_elbow'
  | 'bent_arm_shoulder'
  | 'straight_arm_elbow'
  | 'straight_arm_shoulder'
  | 'core_lumbar'
  | 'core_hip_flexor'
  | 'wrist';
export type NodeState = 'locked' | 'unlocked' | 'current';

/** Matches FastAPI `CurrentNode` schema. */
export interface CurrentNode {
  node_id: string;
  exercise_name: string;
  movement_type: MovementType;
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
}

/** Matches FastAPI `ActiveProgression` schema. */
export interface ActiveProgression {
  tree_id: string;
  tree_name: string;
  current_node: CurrentNode;
}

export interface ProgressionsResponse {
  user_id: string;
  updated_at: string;
  active_progressions: ActiveProgression[];
}

/** GET /api/v1/users/me/progressions — current user. */
export const getMyProgressions = () =>
  api<ProgressionsResponse>('/users/me/progressions');

/** GET /api/v1/nodes/{node_id} — node display info (public read). */
export const getNode = (nodeId: string) =>
  api<CurrentNode>(`/nodes/${encodeURIComponent(nodeId)}`, { skipAuth: true });

/* ------------------------------------------------------------------ */
/* Trees + DAG (GET /api/v1/trees, GET /api/v1/trees/{tree_id})       */
/* ------------------------------------------------------------------ */

export type EdgeType = 'progression' | 'regression' | 'lateral';

export interface DagNode {
  node_id: string;
  name: string;
  movement_type: MovementType;
  rank_level: number;
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
}

export interface DagEdge {
  from_node_id: string;
  to_node_id: string;
  edge_type: EdgeType;
}

export interface DagTree {
  tree_id: string;
  slug: string;
  name: string;
  description: string;
  current_node_id: string | null;
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface DagResponse {
  tree: DagTree;
}

/** GET /api/v1/trees/{tree_id} — full DAG with edges + caller's current_node_id. */
export const getTree = (treeId: string) =>
  api<DagResponse>(`/trees/${encodeURIComponent(treeId)}`, { skipAuth: true });

/* ------------------------------------------------------------------ */
/* Tendon strain (GET /api/v1/tendon-strain)                            */
/* ------------------------------------------------------------------ */

export interface TendonPathwayStatusWire {
  pathway: Pathway;
  status: 'ok' | 'watch' | 'deload';
  sparkline: [number, number, number, number];
}

export interface TendonStrainResponse {
  statuses: TendonPathwayStatusWire[];
}

/** GET /api/v1/tendon-strain — per-pathway 4-week sparkline + status. */
export const getTendonStrain = () => api<TendonStrainResponse>('/tendon-strain');

/* ------------------------------------------------------------------ */
/* User account (PATCH/DELETE/POST /api/v1/users/me)                   */
/* ------------------------------------------------------------------ */

export interface MeResponse {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

/** PATCH /api/v1/users/me — update display_name. */
export const updateMe = (payload: { display_name: string }) =>
  api<MeResponse>('/users/me', {
    method: 'PATCH',
    body: payload,
  });

/** DELETE /api/v1/users/me — wipe account (irreversible).
 * Per D19 §deletion, this is now a SOFT delete — sets deleted_at.
 * The account is hard-deleted by the daily purge job after the 7-day
 * grace period. To cancel during the grace window, call restoreMe()
 * or just re-login (auth._resolve_jwt_user clears deleted_at).
 */
export const deleteMe = () =>
  api<void>('/users/me', { method: 'DELETE' });

/** POST /api/v1/users/me/restore — cancel a pending soft-delete.
 * Equivalent to re-login but exposed so the UI can show a
 * "Cancel deletion" button without forcing a logout.
 */
export const restoreMe = () =>
  api<void>('/users/me/restore', { method: 'POST' });

/** POST /api/v1/users/me/export — synchronous JSON dump of the caller's data.
 *
 * Backend returns the file directly with a
 * `Content-Disposition: attachment` header — the browser / page
 * fetcher saves it as a file. We call fetch() directly here
 * (instead of going through `api()`) so we can return the raw
 * `Blob` + suggested filename rather than parsing the response body.
 */
export async function requestExport(): Promise<{ blob: Blob; filename: string }> {
  // Sprint 38 RED-7: cookies only — no Authorization header. The cookie
  // is sent automatically because `credentials: 'include'`.
  const res = await fetch(`${API_BASE}/users/me/export`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text();
    }
    throw new ApiError(res.status, parsed, `${res.status} ${res.statusText} on /users/me/export`);
  }

  // Extract filename from Content-Disposition, fall back to a default.
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? 'calisthenics-tree-export.json';

  return { blob: await res.blob(), filename };
}

/* ------------------------------------------------------------------ */
/* Feed (GET /api/v1/feed)                                              */
/* ------------------------------------------------------------------ */

export interface FeedUser {
  id: string;
  email: string;
  display_name?: string | null;
}

export interface FeedItem {
  id: string;
  user: FeedUser;
  tree_id: string;
  tree_name: string;
  new_node_id: string;
  new_node_name: string;
  trigger: 'CRITICAL_FAIL' | 'PROMOTION' | 'ON_SYNC';
  note: string | null;
  occurred_at: string;
}

export interface FeedResponse {
  items: FeedItem[];
}

/** GET /api/v1/feed — recent unlock events for the authed user + friends. */
export const getFeed = (limit = 20) =>
  api<FeedResponse>(`/feed?limit=${limit}`);

/* ------------------------------------------------------------------ */
/* Friends + public profile                                            */
/* ------------------------------------------------------------------ */

export interface FriendSummary {
  user_id: string;
  email: string;
  display_name: string | null;
  followed_at: string;
}

export interface FriendsResponse {
  items: FriendSummary[];
}

export interface CurrentNodePublic {
  tree_id: string;
  tree_name: string;
  node_id: string;
  node_name: string;
}

export interface PublicProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  current_nodes: CurrentNodePublic[];
}

/** POST /api/v1/friends — follow a user by email or user_id. */
export const followUser = (payload: { email?: string; user_id?: string }) =>
  api<{ status: string; followee_id: string }>('/friends', {
    method: 'POST',
    body: payload,
  });

/** DELETE /api/v1/friends/{user_id} — unfollow. */
export const unfollowUser = (userId: string) =>
  api<void>(`/friends/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });

/** GET /api/v1/friends — list who I follow. */
export const getFriends = () => api<FriendsResponse>('/friends');

/** GET /api/v1/users/{user_id} — public profile. */
export const getPublicProfile = (userId: string) =>
  api<PublicProfile>(`/users/${encodeURIComponent(userId)}`);

/** GET /api/v1/users/{user_id}/unlocks — their recent unlock events. */
export const getUserUnlocks = (userId: string, limit = 20) =>
  api<FeedResponse>(`/users/${encodeURIComponent(userId)}/unlocks?limit=${limit}`);

/* ------------------------------------------------------------------ */
/* Workout sync (POST /api/v1/workouts/sync)                            */
/* ------------------------------------------------------------------ */

export interface SyncedSet {
  set_number: number;
  reps: number | null;
  hold_secs: number | null;
}

export interface SyncedLog {
  node_id: string;
  sets: SyncedSet[];
}

export interface SyncedWorkout {
  client_workout_id: string;
  completed_at: string; // ISO 8601
  logs: SyncedLog[];
}

export interface StateUpdate {
  tree_id: string;
  old_node_id: string;
  new_node_id: string;
  trigger: 'CRITICAL_FAIL' | 'PROMOTION' | 'ON_SYNC';
  reason: string;
}

export interface WorkoutsSyncRequest {
  sync_client_timestamp: string;
  workouts: SyncedWorkout[];
}

export interface WorkoutsSyncResponse {
  status: 'success';
  synced_workout_count: number;
  state_updates: {
    promotions: StateUpdate[];
    regressions: StateUpdate[];
  };
}

/** POST /api/v1/workouts/sync — offline-first reconcile. */
export const syncWorkouts = (payload: WorkoutsSyncRequest) =>
  api<WorkoutsSyncResponse>('/workouts/sync', {
    method: 'POST',
    body: payload,
  });

/** GET /healthz — no auth.
 *
 * Called at the ROOT path, NOT under /api/v1 — the backend mounts the
 * health router at /healthz directly (see main.py line 73) so an
 * orchestrator liveness probe doesn't need to know the API version.
 * Going through api() would prepend '/api/v1' and 404.
 */
export const getHealth = () =>
  fetch('/healthz').then(async (r) => {
    if (!r.ok) throw new ApiError(r.status, await r.text(), `${r.status} ${r.statusText} on /healthz`);
    return (await r.json()) as { status: string };
  });