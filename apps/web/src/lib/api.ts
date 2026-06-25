/**
 * API client — typed fetch wrapper for the FastAPI backend.
 *
 * Backend lives in apps/api/ (FastAPI + Postgres). Routes:
 *   GET  /healthz                                  → HealthResponse
 *   GET  /api/v1/users/me/progressions             → ProgressionsResponse
 *   POST /api/v1/onboarding/place                  → OnboardingPlaceResponse
 *   POST /api/v1/workouts/sync                     → WorkoutsSyncResponse
 *
 * Auth: bearer token from import.meta.env.VITE_API_TOKEN (dev) or sessionStorage (prod).
 * Base URL: import.meta.env.VITE_API_URL (defaults to /api in dev via Vite proxy).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN = import.meta.env.VITE_API_TOKEN || 'dev-bearer-token-replace-me';

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
  /** Skip auth header (for /healthz etc.). */
  skipAuth?: boolean;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = opts;
  const init: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(skipAuth ? {} : { Authorization: `Bearer ${TOKEN}` }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(`${API_BASE}${path}`, init);

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text();
    }
    throw new ApiError(res.status, parsed, `${res.status} ${res.statusText} on ${path}`);
  }

  // 204 No Content
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
