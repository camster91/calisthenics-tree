/**
 * useSubscription — React hook wrapping GET /api/v1/billing/me.
 *
 * Returns the current user's billing state plus a `refetch()` callback
 * for after a successful checkout (when we come back from the provider
 * hosted page). Anonymous users get `status: 'anonymous'` and no
 * `data` — callers should render a "Sign in to manage subscription"
 * CTA in that case.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError } from './api';
import {
  type BillingStatus,
  getBillingStatus,
} from './billing';
import { authStore } from './auth-store';

export type SubscriptionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; error: ApiError | Error }
  | { status: 'ok'; data: BillingStatus };

export type UseSubscriptionResult = SubscriptionState & {
  /** True if the current user has a paid tier (monthly/yearly/lifetime). */
  isPaid: boolean;
  /** Manually re-fetch (e.g. after returning from a checkout redirect). */
  refetch: () => Promise<void>;
};

export function useSubscription(): UseSubscriptionResult {
  const [state, setState] = useState<SubscriptionState>({ status: 'loading' });

  const refetch = useCallback(async () => {
    if (!authStore.get().accessToken) {
      setState({ status: 'anonymous' });
      return;
    }
    try {
      const data = await getBillingStatus();
      setState({ status: 'ok', data });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token rejected — treat as anonymous. AuthProvider will
        // already be redirecting; this just stops the hook from
        // hanging on a stale token.
        setState({ status: 'anonymous' });
        return;
      }
      setState({ status: 'error', error: err as ApiError | Error });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isPaid =
    state.status === 'ok' && state.data.tier !== 'free' && !state.data.cancel_at;

  return { ...state, isPaid, refetch };
}