/**
 * API client — typed fetch wrapper for the FastAPI backend.
 *
 * Backend lives in apps/api/ (FastAPI + Postgres). Auth is JWT (Phase 2).
 *
 * Auth flow:
 *   - Reads access token from authStore (set by AuthProvider)
 *   - On 401, calls authStore.handleUnauthorized() which triggers a
 *     refresh + retry-once via the AuthProvider's registered handler.
 *   - If refresh fails, the original 401 surfaces to the caller.
 *
 * Base URL: import.meta.env.VITE_API_URL (defaults to '/api' in dev via
 * the Vite proxy, which forwards to http://localhost:8000).
 */

import { authStore } from './auth-store';

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
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip auth header (for /healthz, /auth/magic-link, /auth/verify, /auth/refresh). */
  skipAuth?: boolean;
  /** Skip the auto-refresh-on-401 retry. Useful for the auth endpoints themselves. */
  skipRefresh?: boolean;
}

function buildHeaders(opts: RequestOptions): HeadersInit {
  const { skipAuth, headers } = opts;
  const token = authStore.get().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(skipAuth || !token ? {} : { Authorization: `Bearer ${token}` }),
    ...headers,
  };
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = opts;

  const doFetch = (): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        ...buildHeaders({ skipAuth, headers }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  // Auto-refresh on 401 (once), unless caller opted out (auth endpoints).
  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const newToken = await authStore.handleUnauthorized();
    if (newToken) {
      // Retry the original request with the fresh token.
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

/** DELETE /api/v1/users/me — wipe account (irreversible). */
export const deleteMe = () =>
  api<void>('/users/me', { method: 'DELETE' });

/** POST /api/v1/users/me/export — kick off data export job. */
export const requestExport = () =>
  api<{ status: string; job_id: string; requested_at: string }>(
    '/users/me/export',
    { method: 'POST' },
  );

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

/** GET /healthz — no auth. */
export const getHealth = () => api<{ status: string }>('/healthz', { skipAuth: true });