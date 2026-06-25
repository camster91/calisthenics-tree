/**
 * RequireOnboarded — gate a route subtree behind a completed placement.
 *
 * Must be nested INSIDE <RequireAuth> (relies on `useAuth().status`).
 * Checks `useOnboarding().isComplete`; if not, bounces to /onboarding/q1.
 *
 * Used to protect routes that assume the user has placed nodes per tree
 * (Home/DAG browse, workout log, etc.).
 */
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '../lib/auth';
import { useOnboarding } from '../lib/onboarding';

export function RequireOnboarded() {
  const { status } = useAuth();
  const { isComplete } = useOnboarding();

  // Still loading auth — don't make a redirect decision yet.
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

  // Authed but no placement yet → bounce into the flow.
  // Note: a fresh-signup user lands here after verify. We deliberately
  // don't loop on /onboarding/result — that's a separate destination the
  // user reaches by completing the flow themselves.
  if (!isComplete) {
    return <Navigate to="/onboarding/q1" replace />;
  }

  return <Outlet />;
}