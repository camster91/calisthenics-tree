/**
 * PricingPage — /pricing
 *
 * Public page (no auth required) listing the three plans sourced from
 * /api/v1/billing/plans. Authed users see their current tier badge
 * + Cancel CTA if paid.
 *
 * The checkout button calls POST /api/v1/billing/checkout and redirects
 * to the provider-hosted URL. When the active provider is NullProvider
 * (the default — see apps/api/calisthenics_api/billing/provider.py),
 * the endpoint returns 503 and we render a clear "payments coming soon"
 * banner instead of a checkout button.
 *
 * Pricing source-of-truth is the API (settings.price_*_cents), not
 * this file — change deploy config and the page picks it up on next
 * load without a rebuild.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

import {
  type PlansResponse,
  type Tier,
  createCheckout,
  getPlans,
  isApiError,
} from '../lib/billing';
import { ApiError } from '../lib/api';
import { useSubscription } from '../lib/useSubscription';
import { Button } from '../components/ui/button';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: PlansResponse };

const FEATURED_TIER: Tier = 'yearly';

const TIER_BADGE: Record<Tier, { label: string; tone: string }> = {
  free: { label: 'Free', tone: 'bg-surface-muted text-surface-fg-muted' },
  monthly: { label: 'Pro · Monthly', tone: 'bg-primary/15 text-primary' },
  yearly: { label: 'Pro · Yearly', tone: 'bg-primary/15 text-primary' },
  lifetime: { label: 'Founders', tone: 'bg-amber-500/15 text-amber-700' },
};

export default function PricingPage() {
  const [plans, setPlans] = useState<LoadState>({ status: 'loading' });
  const [checkoutState, setCheckoutState] = useState<
    { status: 'idle' } | { status: 'loading'; tier: Tier } | { status: 'error'; message: string }
  >({ status: 'idle' });
  const subscription = useSubscription();

  useEffect(() => {
    getPlans()
      .then((data) => setPlans({ status: 'ok', data }))
      .catch((err: unknown) =>
        setPlans({
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Failed to load plans.',
        }),
      );
  }, []);

  // After returning from a successful checkout, /billing/success?session_id=…
  // redirects back here and we want the tier badge to refresh.
  useEffect(() => {
    subscription.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckout(tier: Tier) {
    if (tier === 'free') return;
    setCheckoutState({ status: 'loading', tier });
    try {
      const result = await createCheckout(tier);
      if (!result.provider_configured) {
        setCheckoutState({
          status: 'error',
          message:
            'Payments are not configured on this environment. Set PAYMENT_PROVIDER=stripe (or storekit) and provide API keys.',
        });
        return;
      }
      window.location.href = result.checkout_url;
    } catch (err) {
      if (isApiError(err) && err.status === 503) {
        setCheckoutState({
          status: 'error',
          message:
            'Payments are not configured on this environment. The plan you select is recorded — billing will activate as soon as the provider is wired up.',
        });
        return;
      }
      setCheckoutState({
        status: 'error',
        message:
          err instanceof ApiError
            ? `${err.status} ${err.message}`
            : 'Checkout failed. Try again.',
      });
    }
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-12"
    >
      <header className="space-y-4 text-balance">
        <p className="chip">Pricing</p>
        <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl">
          Train smarter with Pro.
        </h1>
        <p className="max-w-2xl text-base text-surface-fg-muted">
          Catch fatigue before it catches you. Pro adds deep tendon strain
          history, unlimited friends + challenges, and early access to new
          trees.
        </p>
        <CurrentPlanBadge subscription={subscription} />
      </header>

      {checkoutState.status === 'error' && (
        <div
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700"
          data-testid="checkout-error"
        >
          {checkoutState.message}
        </div>
      )}

      <section aria-label="Plans" className="grid gap-4 lg:grid-cols-3">
        {plans.status === 'loading' && <PlanSkeletons />}
        {plans.status === 'error' && <PlanError message={plans.message} />}
        {plans.status === 'ok' &&
          plans.data.plans.map((plan) => {
            const featured = plan.tier === FEATURED_TIER;
            const isCurrent =
              subscription.status === 'ok' && subscription.data.tier === plan.tier;
            return (
              <article
                key={plan.tier}
                data-testid={`plan-${plan.tier}`}
                className={
                  'card relative flex flex-col gap-4 ' +
                  (featured ? 'ring-2 ring-primary' : '')
                }
              >
                {featured && (
                  <span className="chip self-start bg-primary text-primary-on">
                    <Sparkles aria-hidden className="h-3 w-3" /> Best value
                  </span>
                )}
                <header>
                  <h2 className="text-lg font-semibold">
                    Pro · {plan.tier}
                  </h2>
                  <p className="mt-1 font-mono text-3xl font-bold tabular-nums">
                    ${(plan.price_cents / 100).toFixed(2)}
                    <span className="ml-1 text-sm font-normal text-surface-fg-muted">
                      {plan.interval === 'one_time'
                        ? 'one-time'
                        : `/ ${plan.interval}`}
                    </span>
                  </p>
                </header>
                <ul className="flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        aria-hidden
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={featured ? 'default' : 'outline'}
                  disabled={
                    isCurrent ||
                    checkoutState.status === 'loading' ||
                    subscription.status === 'anonymous'
                  }
                  onClick={() => handleCheckout(plan.tier)}
                >
                  {isCurrent
                    ? 'Current plan'
                    : checkoutState.status === 'loading' &&
                        checkoutState.tier === plan.tier
                      ? 'Loading…'
                      : subscription.status === 'anonymous'
                        ? 'Sign in to choose'
                        : `Choose ${plan.tier}`}
                </Button>
              </article>
            );
          })}
      </section>

      <div className="rounded-lg border border-surface-border bg-surface-subtle px-6 py-5 text-sm">
        <h2 className="text-base font-semibold">What's free</h2>
        <ul className="mt-2 grid gap-1 text-surface-fg-muted sm:grid-cols-2">
          <li>✓ 3 progression trees (30 nodes)</li>
          <li>✓ Unlimited workout logging</li>
          <li>✓ Personalized placement</li>
          <li>✓ 5 friends + basic feed</li>
        </ul>
      </div>

      <p className="text-center text-xs text-surface-fg-subtle">
        Cancel anytime · restore on any device via sign-in. Questions?{' '}
        <Link to="/welcome" className="underline">
          Read the FAQ
        </Link>
        .
      </p>
    </main>
  );
}

function CurrentPlanBadge({
  subscription,
}: {
  subscription: ReturnType<typeof useSubscription>;
}) {
  if (subscription.status !== 'ok') return null;
  const { tier } = subscription.data;
  const badge = TIER_BADGE[tier];
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className="text-surface-fg-muted">Your current plan:</span>
      <span
        data-testid="current-tier-badge"
        className={`chip ${badge.tone}`}
      >
        {badge.label}
      </span>
      {tier !== 'free' && subscription.data.cancel_at && (
        <span className="text-xs text-amber-700">
          · cancels{' '}
          {new Date(subscription.data.cancel_at).toLocaleDateString()}
        </span>
      )}
    </p>
  );
}

function PlanSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="card flex flex-col gap-3 animate-pulse"
        >
          <div className="h-4 w-16 rounded bg-surface-muted" />
          <div className="h-8 w-24 rounded bg-surface-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surface-muted" />
            <div className="h-3 w-3/4 rounded bg-surface-muted" />
          </div>
          <div className="mt-auto h-10 w-full rounded bg-surface-muted" />
        </div>
      ))}
    </>
  );
}

function PlanError({ message }: { message: string }) {
  return (
    <div className="card col-span-full text-sm text-amber-700">
      Couldn't load plans: {message}
    </div>
  );
}