/**
 * RequireAuth — gate a route subtree behind an authenticated session.
 *
 * Shows a loading state while the auth provider hydrates, redirects to
 * /login (with a `?next=<current-path>` param so the verify page can bounce
 * back here) when the user is anonymous.
 *
 * Use in App.tsx like:
 *   <Route element={<RequireAuth />}>
 *     <Route index element={<HomePage />} />
 *     ...
 *   </Route>
 */
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '../lib/auth';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  // Authenticated users who land on /login/etc. (after a hard refresh)
  // get routed through normally — no extra redirect logic here.
  useEffect(() => {
    // Track the path the user was trying to reach so we can return them
    // here after login. We store it in location.state to keep it transient.
    if (status === 'anonymous') {
      // Persist the intended destination in sessionStorage so a hard
      // refresh or back-button doesn't lose it.
      try {
        sessionStorage.setItem('ct:auth:next', location.pathname + location.search);
      } catch {
        // sessionStorage may be blocked; fall back gracefully
      }
    }
  }, [status, location.pathname, location.search]);

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}