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
 *   state change and hydrates from localStorage on mount.
 * - `api.ts` reads `authStore.get().accessToken` and registers a refresh
 *   handler at app boot via `authStore.setUnauthorizedHandler`.
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
 * Hydration-tracking machinery.
 *
 * Sprint 38 RED-7: the auth source of truth is now the session cookie,
 * not localStorage. AuthProvider fires `/auth/whoami` once on mount to
 * resolve the cookie. Other modules (api.ts) that need to dispatch a
 * request before that resolves await `authReady()` so they don't:
 *   - bounce anonymous to /login mid-flight (RequireAuth), or
 *   - race the auth determination.
 *
 * The promise is single-shot — first call creates it, future calls
 * await the same instance. Once `_snapshot.status !== 'loading'` the
 * promise resolves.
 */
let _readyPromise: Promise<void> | null = null;
let _readyResolve: (() => void) | null = null;
function _ensureReadyPromise(): Promise<void> {
  if (_readyPromise) return _readyPromise;
  _readyPromise = new Promise<void>((resolve) => {
    if (_snapshot.status !== 'loading') {
      resolve();
      return;
    }
    _readyResolve = resolve;
  });
  return _readyPromise;
}

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
    // Wake up waiters the moment auth leaves the loading state.
    if (next.status !== 'loading') {
      // Replace the promise so future awaits also resolve immediately
      // (the previous one was a one-shot; if the consumer raced and
      // never heard about it, we don't want a stale deferred rejection).
      _readyResolve?.();
      _readyPromise = Promise.resolve();
      _readyResolve = null;
    }
    for (const l of listeners) l(next);
  },

  /**
   * Sprint 38 RED-7: returns a promise that resolves once auth has
   * left the loading state (authed or anonymous). Used by api() to
   * avoid racing the /auth/whoami hydration. Resolves immediately if
   * hydration has already completed.
   */
  ready(): Promise<void> {
    return _ensureReadyPromise();
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
   * returning a new access token causes the original request to be retried,
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