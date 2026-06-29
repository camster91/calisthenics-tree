/**
 * Auth store — module-level signal that lets non-React code (api.ts)
 * read the current access token + user without going through React Context.
 *
 * Why not just `useAuth()` everywhere?
 * - The API client is called from event handlers, route loaders, and
 *   non-component code paths where hooks aren't valid.
 * - Passing `getAccessToken` callbacks through props is brittle.
 *
 * Pattern:
 * - `AuthProvider` (apps/web/src/lib/auth.tsx) writes to this store on every
 *   state change. Initial state is seeded from localStorage (`ct:user` cache)
 *   synchronously in the provider's useState initializer, so non-React code
 *   that reads `authStore.get()` on first render sees the hydrated state.
 * - `api.ts` no longer reads the token from JS — auth rides on HttpOnly
 *   cookies (Sprint 38 RED-7). The store keeps the `accessToken` /
 *   `refreshToken` fields as sentinels for the local-mode escape hatch
 *   (`'local-dev-mode'`) and to drive apiStore.handleUnauthorized() retries.
 * - `authStore.setUnauthorizedHandler` registers a 401-refresh handler so
 *   the api() helper can re-issue calls when a cookie goes stale.
 *
 * The store is intentionally tiny — no zustand / redux / jotai dependency.
 */

import type { UserPublic } from './api-types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthSnapshot {
  status: AuthStatus;
  user: UserPublic | null;
  accessToken: string | null;
  refreshToken: string | null;
  accessExpiresAt: string | null; // ISO 8601
}

const initial: AuthSnapshot = {
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,
  accessExpiresAt: null,
};

let _snapshot: AuthSnapshot = initial;
const listeners = new Set<(s: AuthSnapshot) => void>();

/**
 * Called by api.ts when a request returns 401. Returns a fresh access
 * token (via refresh) or null if the user must re-authenticate.
 */
export type UnauthorizedHandler = () => Promise<string | null>;
let _unauthorizedHandler: UnauthorizedHandler | null = null;

export const authStore = {
  get(): AuthSnapshot {
    return _snapshot;
  },

  set(next: AuthSnapshot): void {
    _snapshot = next;
    for (const l of listeners) l(next);
  },

  /**
   * Subscribe to snapshot changes. Returns an unsubscribe function.
   * Useful for the API client to invalidate cached tokens without
   * going through React.
   */
  subscribe(listener: (s: AuthSnapshot) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Register a handler called when an API request returns 401. The handler
   * should attempt to refresh the access token using the refresh token;
   * returning a non-null token causes the original request to be retried,
   * returning null causes the 401 to surface to the caller.
   */
  setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    _unauthorizedHandler = handler;
  },

  /**
   * Called by api.ts when a request returns 401. Returns the refreshed
   * access token, or null if refresh failed.
   */
  async handleUnauthorized(): Promise<string | null> {
    if (!_unauthorizedHandler) return null;
    try {
      return await _unauthorizedHandler();
    } catch {
      return null;
    }
  },
};