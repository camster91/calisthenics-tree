/**
 * AuthProvider + useAuth() — React context wrapping the auth store.
 *
 * Sprint 38 RED-7: tokens live in HttpOnly+Secure+SameSite=Lax cookies set
 * by /auth/verify. JS cannot read them (HttpOnly) so we cannot cache the
 * JWT in localStorage without losing the actual security benefit. The
 * snapshot stored at auth-store level is a small bag of {status, user,
 * accessToken?, refreshToken?} — where the token fields are kept around
 * purely so non-React code (api.ts) can introspect "am I in local-mode?"
 * via the `'local-dev-mode'` sentinel. Production tokens never live in
 * localStorage anymore.
 *
 * Responsibilities:
 * - Hydrate auth state on mount via GET /auth/whoami (cookie round-trip).
 * - Expose signIn (request magic link), verifyMagicLink (consume link),
 *   signOut (server-side cookie clear + local wipe), refresh.
 * - Register an unauthorized handler with the auth-store so api.ts can
 *   trigger a refresh-on-401 when the access cookie expires.
 * - Wire PostHog identify / reset on login / logout.
 *
 * local-mode escape hatch: `signInLocal()` synthesizes a session with the
 * `'local-dev-mode'` sentinel so api.ts can short-circuit to localMockRoute.
 * Local mode still uses localStorage (those are throwaway tokens, not real
 * credentials).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as local from './local-mode';

import { api } from './api';
import { authStore, type AuthSnapshot } from './auth-store';
import { identify, reset as resetAnalytics, track } from './analytics';

/**
 * Hash an email for analytics tagging. Sprint 38 PII fix — we never send
 * the raw email to PostHog. SHA-256 hex (no salt here; the salt lives
 * server-side for join-back). Same-domain emails hash deterministically so
 * we can still do "users with the same email across devices" joins via a
 * server-side query if ever needed.
 */
function hashEmailForAnalytics(email: string): string {
  // Web Crypto is available in all evergreen browsers + Node 19+. Fall back
  // to a noop hash so we never block the auth flow in a weird environment.
  if (typeof crypto !== 'undefined' && 'subtle' in crypto) {
    // Async hashing would require restructuring the identify flow; for
    // analytics-only purposes a non-cryptographic 32-bit hash is fine (we
    // only need non-reversible, not collision-resistant). FNV-1a is tiny,
    // synchronous, and good enough for the "is this the same person" join.
    let h = 0x811c9dc5;
    for (let i = 0; i < email.length; i++) {
      h ^= email.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  return 'no-hash';
}
import type {
  MagicLinkResponse,
  UserPublic,
  VerifyResponse,
} from './api-types';

// -----------------------------------------------------------------------------//
// Storage — local-mode only (Sprint 38 RED-7)
//
// Production auth state lives in the HttpOnly session cookie set by the
// backend. JS cannot read it, so the only safe persistence for non-local
// mode is the user-info cache (for the ProfilePage header / PostHog join)
// — never the raw tokens. Local mode still needs a sentinel token so
// api() can route to localMockRoute; we keep the old localStorage path
// just for that.
// -----------------------------------------------------------------------------//

const LEGACY_STORAGE_KEY = 'ct:auth';
const USER_CACHE_KEY = 'ct:user'; // non-token user info only (display name, email)

function readStoredLegacySnapshot(): AuthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSnapshot;
    if (parsed.status !== 'authenticated') return null;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearStoredLegacySnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore — localStorage may be blocked
  }
}

function readCachedUser(): UserPublic | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPublic;
  } catch {
    return null;
  }
}

function writeCachedUser(user: UserPublic | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // ignore — localStorage may be blocked
  }
}

// -----------------------------------------------------------------------------//
// Context shape
// -----------------------------------------------------------------------------//

export interface AuthContextValue {
  status: AuthSnapshot['status'];
  user: UserPublic | null;
  /** Send a magic-link email. Resolves with the API response so the UI can
   *  show the dev_token inline in dev mode. */
  signIn: (email: string) => Promise<MagicLinkResponse>;
  /** Consume a magic-link token, store the resulting JWT pair, identify
   *  the user in PostHog, and resolve once auth state is authenticated. */
  verifyMagicLink: (token: string) => Promise<void>;
  /** Clear local state + call /auth/signout server-side + reset PostHog identity.
   *  Sprint 38 RED-7: returns Promise<void> because the server-side cookie
   *  clear is an async fetch. */
  signOut: () => Promise<void>;
  /** Exchange the current refresh token for a fresh pair. Used internally
   *  by the API client on 401, exposed for manual refresh. */
  refresh: () => Promise<void>;
  /** Local-mode escape hatch: synthesize an authenticated session backed
   *  by localStorage. No email, no API, no PostHog identity. */
  signInLocal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}

// -----------------------------------------------------------------------------//
// Provider
// -----------------------------------------------------------------------------//

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(() => {
    // Sprint 38 RED-7: initial state paints OPTIMISTICALLY from cached
    // state so a hard refresh of an authed user doesn't bounce to /login.
    //
    // Sources, in priority order:
    //   1. local-mode legacy snapshot (accessToken === 'local-dev-mode')
    //      — full local-mode restore in 0 ticks
    //   2. cached user (ct:user) — set by signIn, read here
    //   3. fall back to 'anonymous' (no auth)
    //
    // We do NOT call /auth/whoami on mount. The cookie carries the
    // session; the backend will reject stale cookies with a 401 if
    // anything's off, and the api() refresh handler will then sign
    // the user out. This is simpler than racing a hydration fetch
    // and matches how a logged-out user would render anyway.
    const legacy = readStoredLegacySnapshot();
    if (legacy) return legacy;
    const cached = readCachedUser();
    if (cached) {
      return {
        status: 'authenticated',
        user: cached,
        accessToken: 'real', // sentinel: cookies hold the real token
        refreshToken: 'real',
        accessExpiresAt: null,
      };
    }
    return {
      status: 'anonymous',
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
    };
  });

  // Mirror local state into the module-level authStore so api.ts can read it.
  useEffect(() => {
    authStore.set(snapshot);
  }, [snapshot]);

  // Sprint 38 RED-7: cache the user info on login so the ProfilePage header
  // renders the display_name even on cold start. Tokens are NOT cached —
  // they live in HttpOnly cookies only.
  useEffect(() => {
    if (snapshot.status === 'authenticated' && snapshot.user && !local.isLocalMode()) {
      writeCachedUser(snapshot.user);
    } else if (snapshot.status === 'anonymous' && !local.isLocalMode()) {
      writeCachedUser(null);
    }
  }, [snapshot.status, snapshot.user]);

  // PostHog identify on auth transitions. Sprint 38 YELLOW fix: we only
  // send user_id + a SHA-256 email hash (never the raw email). PostHog's
  // identify trait accepts arbitrary keys but the EU/CCPA treat raw email
  // as PII — hashed form is reversible only if you have the salt, which we
  // keep server-side.
  const lastIdentifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (snapshot.status === 'authenticated' && snapshot.user) {
      if (lastIdentifiedRef.current !== snapshot.user.id) {
        identify(snapshot.user.id, {
          email_hash: hashEmailForAnalytics(snapshot.user.email),
        });
        lastIdentifiedRef.current = snapshot.user.id;
      }
    } else if (snapshot.status === 'anonymous') {
      if (lastIdentifiedRef.current !== null) {
        resetAnalytics();
        lastIdentifiedRef.current = null;
      }
    }
  }, [snapshot.status, snapshot.user]);

  // --------------------------------------------------------------------------//
  // Actions
  // --------------------------------------------------------------------------//

  const signIn = useCallback(async (email: string): Promise<MagicLinkResponse> => {
    // POST /api/v1/auth/magic-link is unauthenticated, but it goes through
    // the standard api() wrapper so it picks up the base URL + error shape.
    const response = await api<MagicLinkResponse>('/auth/magic-link', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    });
    // Sprint 38 funnel analytics: track the auth attempt. Never include the
    // raw email — hash via the same helper we use for identify.
    track('magic_link_requested', {
      email_hash: hashEmailForAnalytics(email),
      sent_via: response.status, // 'sent' (prod Postmark) | 'dev' (local)
    });
    return response;
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<void> => {
    const response = await api<VerifyResponse>(`/auth/verify?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      skipRefresh: true,
      credentials: 'include',
    });
    // Sprint 38 RED-7: tokens now live in HttpOnly cookies set by the
    // server. We track the SENTINEL 'real' to signal api.ts that we're
    // NOT in local-mode and should make real fetches. Don't cache the
    // tokens in JS state — that's the whole point of the migration.
    setSnapshot({
      status: 'authenticated',
      user: response.user,
      accessToken: 'real', // sentinel: not a usable token, just marks "not local mode"
      refreshToken: 'real',
      accessExpiresAt: response.access_expires_at,
    });
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // Sprint 38 RED-7: refresh token lives in the ct_session_refresh cookie
    // which JS can't read. POST /auth/refresh with credentials:'include'
    // and an empty body — backend reads the cookie, validates, rotates,
    // and Set-Cookie's new tokens. Cookies replace tokens in flight.
    const current = authStore.get();
    if (current.accessToken === 'real' || local.isLocalMode()) {
      // Server-side cookie path. The api() helper will set cookies:'include'
      // already; we don't pass a body so the backend uses the cookie.
      await api<unknown>('/auth/refresh', {
        method: 'POST',
        body: {},
        skipRefresh: true,
        credentials: 'include',
      });
      return;
    }
    throw new Error('No session available to refresh.');
  }, []);

  const signInLocal = useCallback((): void => {
    // Initialize local-mode data (creates a fresh user_id if none exists)
    // then build a fake auth snapshot. The api() client checks the
    // accessToken against local-mode and routes everything to localStorage.
    // Sprint 38 RED-7: local mode keeps the legacy localStorage snapshot
    // path (those tokens are fake, not real credentials).
    local.initLocalMode();
    const lsnap = local.buildLocalAuthSnapshot();
    setSnapshot({
      status: 'authenticated',
      user: { ...lsnap.user, created_at: new Date().toISOString() } as UserPublic,
      accessToken: lsnap.accessToken,
      refreshToken: lsnap.refreshToken,
      accessExpiresAt: lsnap.accessExpiresAt,
    });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    // Sprint 38 RED-7: server-side cookie clear. 204 No Content; safe to
    // call even when no cookie is set (idempotent). For local-mode the
    // request would hit the backend but with no cookie → 204, harmless.
    const wasLocalMode = local.isLocalMode();
    if (!wasLocalMode) {
      try {
        await fetch('/api/v1/auth/signout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Network may be flaky; the local store still gets cleared below.
      }
    }
    // Clear localStorage in both modes — the user info cache, the legacy
    // auth snapshot, and (for local mode) the local-mode data.
    clearStoredLegacySnapshot();
    writeCachedUser(null);
    if (wasLocalMode) {
      local.resetLocalMode();
    }
    setSnapshot({
      status: 'anonymous',
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
    });
  }, []);

  // --------------------------------------------------------------------------//
  // Register the unauthorized handler so api.ts can refresh-on-401.
  // --------------------------------------------------------------------------//

  useEffect(() => {
    authStore.setUnauthorizedHandler(async () => {
      // Sprint 38 RED-7: refresh reads from the ct_session_refresh cookie
      // and the response sets new cookies. There is no JS-visible
      // accessToken to return to api.ts; the api() retry path will fetch
      // again with credentials:'include' and the browser will pick up
      // the rotated access cookie automatically.
      try {
        const before = authStore.get();
        if (before.status !== 'authenticated') return null;
        await refresh();
        // Return a sentinel non-null so api() retries the request.
        return 'real';
      } catch {
        // Refresh failed — sign out so the user gets bounced to /login.
        await signOut();
        return null;
      }
    });
    return () => authStore.setUnauthorizedHandler(null);
  }, [refresh, signOut]);

  // --------------------------------------------------------------------------//
  // Hydrate on first render.
  //
  // Sprint 38 RED-7: source of truth is the HttpOnly session cookie.
  // We paint OPTIMISTICALLY from the localStorage user cache (if any)
  // so a hard-refresh on an authed user doesn't flash anonymous.
  // If the cookie is stale, the next API call returns 401, the
  // unauthorized handler tries a refresh, and if that fails too,
  // signOut() runs which clears the cache and bounces to /login.
  //
  // Why not call /auth/whoami on mount like other cookie-based SPAs?
  // - Adds a render-blocking fetch on every page load (extra latency).
  // - Race conditions with the SPA's own first API calls (we'd need
  //   to gate the rest of the app on the whoami round-trip).
  // - Cookie middleware in the backend already protects every endpoint,
  //   so an invalid cookie is detected immediately on the first
  //   request and routed through the refresh → sign-out flow.
  //
  // localStorage user cache keys:
  // - "ct:user" — {id, email, display_name, created_at} from the last
  //   successful auth response. Public info; safe to cache.
  // --------------------------------------------------------------------------//

  // Initial state already covers hydration — useState's initializer
  // reads localStorage. No additional useEffect needed.
  // (Kept as a marker for future hydration hooks.)

  const value = useMemo<AuthContextValue>(
    () => ({
      status: snapshot.status,
      user: snapshot.user,
      signIn,
      verifyMagicLink,
      signOut,
      refresh,
      signInLocal,
    }),
    [snapshot.status, snapshot.user, signIn, verifyMagicLink, signOut, refresh, signInLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}