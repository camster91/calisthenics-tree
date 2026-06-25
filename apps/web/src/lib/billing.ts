/**
 * Billing API client + types.
 *
 * Mirrors apps/api/calisthenics_api/schemas.py:
 *   - BillingStatus     → GET /api/v1/billing/me
 *   - PlanInfo / PlansResponse → GET /api/v1/billing/plans
 *   - CheckoutResponse  → POST /api/v1/billing/checkout
 *   - CancelResponse    → POST /api/v1/billing/cancel
 *
 * Tier ordering (matches backend `tier_at_least`):
 *   free < (monthly == yearly) < lifetime
 *
 * When the active payment provider is NullProvider (the default until
 * Stripe/StoreKit is wired), `createCheckout` throws an ApiError with
 * status 503. The PricingPage handles this by rendering a "coming
 * soon" notice instead of a checkout button.
 */

import { ApiError, api } from './api';

export type Tier = 'free' | 'monthly' | 'yearly' | 'lifetime';

export interface BillingStatus {
  tier: Tier;
  provider: 'stripe' | 'storekit' | 'manual' | null;
  started_at: string | null;
  expires_at: string | null;
  cancel_at: string | null;
}

export interface PlanInfo {
  tier: Exclude<Tier, 'free'>;
  price_cents: number;
  interval: 'month' | 'year' | 'one_time';
  features: string[];
}

export interface PlansResponse {
  currency: 'USD';
  plans: PlanInfo[];
}

export interface CheckoutResponse {
  checkout_url: string;
  external_session_id: string;
  provider_configured: boolean;
}

export interface CancelResponse {
  status: 'cancel_scheduled';
  effective_at: string | null;
}

/** GET /api/v1/billing/me — current user's subscription state. */
export const getBillingStatus = () => api<BillingStatus>('/billing/me');

/** GET /api/v1/billing/plans — public pricing table. */
export const getPlans = () => api<PlansResponse>('/billing/plans', { skipAuth: true });

/** POST /api/v1/billing/checkout — initiate a checkout session.
 *
 * Returns 503 + a descriptive ApiError when the backend has no
 * payment provider configured (default NullProvider). Caller should
 * show a "payments coming soon" state instead of crashing.
 */
export const createCheckout = (tier: Exclude<Tier, 'free'>) =>
  api<CheckoutResponse>('/billing/checkout', {
    method: 'POST',
    body: { tier },
  });

/** POST /api/v1/billing/cancel — schedule cancellation at period end. */
export const cancelSubscription = () =>
  api<CancelResponse>('/billing/cancel', { method: 'POST' });

/** Helper: returns true when the user's tier satisfies `required`. */
export function tierAtLeast(
  userTier: Tier | null | undefined,
  required: Tier,
): boolean {
  const userRank = tierRank(userTier);
  const requiredRank = tierRank(required);
  return userRank >= requiredRank;
}

function tierRank(tier: Tier | null | undefined): number {
  if (tier === 'lifetime') return 20;
  if (tier === 'monthly' || tier === 'yearly') return 10;
  // 'free', null, undefined — treat unknown / unloaded as free
  return 0;
}

/** Type guard for an ApiError with a JSON detail body (FastAPI 4xx). */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}