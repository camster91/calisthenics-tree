/**
 * AuthProvider + useAuth() — React context wrapping the auth store.
 *
 * Responsibilities:
 * - Hydrate auth state from localStorage on mount
 * - Expose signIn (request magic link), verifyMagicLink (consume link),
 *   signOut, refresh
 * - Persist tokens to localStorage on every state change
 * - Register an unauthorized handler with the auth-store so api.ts can
 *   trigger a refresh-on-401
 * - Wire PostHog identify / reset on login / logout
 *
 * Token storage:
 * - localStorage 'ct:auth' holds the snapshot JSON
 * - Acceptable for v1 because tokens are short-lived (1h access, 30d refresh)
 * - For higher security, swap to httpOnly cookies set by the backend —
 *   the surface here doesn't change, only the persistence layer.
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
import { identify, reset as resetAnalytics } from './analytics';
import type {
  MagicLinkResponse,
  RefreshResponse,
  UserPublic,
  VerifyResponse,
} from './api-types';

// -----------------------------------------------------------------------------//
// Storage
// -----------------------------------------------------------------------------//

const STORAGE_KEY = 'ct:auth';

function readStoredSnapshot(): AuthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSnapshot;
    if (parsed.status !== 'authenticated') return null;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSnapshot(snapshot: AuthSnapshot): void {
  if (typeof window === 'undefined') return;
  if (snapshot.status === 'authenticated') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
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
  /** Clear local state + storage + reset PostHog identity. */
  signOut: () => void;
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
    const stored = readStoredSnapshot();
    return stored ?? { status: 'loading', user: null, accessToken: null, refreshToken: null, accessExpiresAt: null };
  });

  // Mirror local state into the module-level authStore so api.ts can read it.
  useEffect(() => {
    authStore.set(snapshot);
  }, [snapshot]);

  // Persist to localStorage on every change.
  useEffect(() => {
    if (snapshot.status === 'loading') return; // don't persist until hydrated
    writeStoredSnapshot(snapshot);
  }, [snapshot]);

  // PostHog identify on auth transitions.
  const lastIdentifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (snapshot.status === 'authenticated' && snapshot.user) {
      if (lastIdentifiedRef.current !== snapshot.user.id) {
        identify(snapshot.user.id, { email: snapshot.user.email });
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
    return response;
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<void> => {
    const response = await api<VerifyResponse>(`/auth/verify?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true,
    });
    setSnapshot({
      status: 'authenticated',
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessExpiresAt: response.access_expires_at,
    });
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const current = authStore.get();
    if (!current.refreshToken) {
      throw new Error('No refresh token available.');
    }
    const response = await api<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: current.refreshToken },
      skipAuth: true,
    });
    setSnapshot({
      status: 'authenticated',
      user: current.user, // refresh endpoint doesn't return the user; keep what we had
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessExpiresAt: response.access_expires_at,
    });
  }, []);

  const signInLocal = useCallback((): void => {
    // Initialize local-mode data (creates a fresh user_id if none exists)
    // then build a fake auth snapshot. The api() client checks the
    // accessToken against local-mode and routes everything to localStorage.
    local.initLocalMode();
    const snapshot = local.buildLocalAuthSnapshot();
    setSnapshot({
      status: 'authenticated',
      user: { ...snapshot.user, created_at: new Date().toISOString() } as UserPublic,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      accessExpiresAt: snapshot.accessExpiresAt,
    });
  }, []);

  const signOut = useCallback((): void => {
    // Clear localStorage synchronously so the next page load (which
    // happens immediately after signOut in the click handler) sees the
    // anonymous state from the first hydration tick.
    try {
      window.localStorage.removeItem('ct:auth');
    } catch {
      // ignore — localStorage may be blocked
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
      try {
        const before = authStore.get();
        if (!before.refreshToken) return null;
        await refresh();
        const after = authStore.get();
        return after.accessToken;
      } catch {
        // Refresh failed — sign out so the user gets bounced to /login.
        signOut();
        return null;
      }
    });
    return () => authStore.setUnauthorizedHandler(null);
  }, [refresh, signOut]);

  // --------------------------------------------------------------------------//
  // Hydrate from storage on first render.
  // The constructor already does this; if nothing was stored we set 'anonymous'.
  // --------------------------------------------------------------------------//

  useEffect(() => {
    if (snapshot.status === 'loading') {
      const stored = readStoredSnapshot();
      if (stored) {
        setSnapshot(stored);
      } else {
        setSnapshot({
          status: 'anonymous',
          user: null,
          accessToken: null,
          refreshToken: null,
          accessExpiresAt: null,
        });
      }
    }
  }, [snapshot.status]);

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