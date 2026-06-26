/**
 * PricingPage — /pricing
 *
 * **Free during early access.** No paid tiers exist right now; this
 * page exists so /pricing doesn't 404 and so we have a single URL
 * to point marketing / share-card copy at when paid tiers land.
 *
 * Billing backend (apps/api/calisthenics_api/billing/) is dormant under
 * the NullProvider — every /billing/* endpoint either returns inert
 * state (GET /me → tier=free) or 503 (POST /checkout). Wiring real
 * Stripe / StoreKit means:
 *   1. Drop a StripeProvider class in billing/provider.py
 *   2. Register it in billing/registry.py
 *   3. Set PAYMENT_PROVIDER=stripe + BILLING_WEBHOOK_SECRET in .env
 *   4. Replace this page's "Free during early access" copy with the
 *      real plan grid from useBilling() / getPlans()
 */

import { Heart } from 'lucide-react';

import { useSubscription } from '../lib/useSubscription';

export default function PricingPage() {
  const subscription = useSubscription();

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16 text-center"
      data-testid="pricing-free-notice"
    >
      <span
        aria-hidden
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <Heart className="h-7 w-7" />
      </span>

      <header className="space-y-3">
        <p className="chip">Pricing</p>
        <h1 className="text-balance text-4xl font-semibold leading-[1.1] sm:text-5xl">
          Free during early access.
        </h1>
        <p className="text-balance text-base text-surface-fg-muted">
          Everything is free while we're shipping the v1. We'll let you
          know well before any paid tier lands — no surprise charges.
        </p>
      </header>

      <div className="w-full rounded-lg border border-surface-border bg-surface-subtle px-6 py-5 text-left text-sm">
        <h2 className="text-base font-semibold">What's included right now</h2>
        <ul className="mt-3 grid gap-1 text-surface-fg-muted sm:grid-cols-2">
          <li>✓ 3 progression trees (30 nodes)</li>
          <li>✓ Unlimited workout logging</li>
          <li>✓ Personalized placement</li>
          <li>✓ Unlimited friends + feed</li>
          <li>✓ Tendon strain insights</li>
          <li>✓ Public profile</li>
        </ul>
      </div>

      {subscription.status === 'ok' && (
        <p className="text-xs text-surface-fg-subtle">
          Your account:{' '}
          <span
            data-testid="current-tier-badge"
            className="chip bg-primary/15 text-primary"
          >
            Free
          </span>
        </p>
      )}

      <p className="text-xs text-surface-fg-subtle">
        Have feedback?{' '}
        <a
          href="/welcome"
          className="underline underline-offset-4 hover:text-surface-fg"
        >
          Read the FAQ
        </a>{' '}
        or reply to any of our emails.
      </p>
    </main>
  );
}