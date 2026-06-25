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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

export interface ProgressionNode {
  id: string;
  tree_slug: string;
  exercise_name: string;
  movement_type: MovementType;
  rank_level: number;
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
  intensity_factor: number;
  joint_pathways: Pathway[];
  video_url: string | null;
  state: NodeState;
}

export interface ProgressionTree {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface ActiveProgression {
  tree: ProgressionTree;
  current_node: ProgressionNode | null;
  locked_node_count: number;
  unlocked_node_count: number;
}

export interface ProgressionsResponse {
  user_id: string;
  progressions: ActiveProgression[];
}

/** GET /api/v1/users/me/progressions — current user. */
export const getMyProgressions = () =>
  api<ProgressionsResponse>('/users/me/progressions');

/** GET /healthz — no auth. */
export const getHealth = () => api<{ status: string }>('/healthz', { skipAuth: true });