/**
 * Wireframe — Subscription management.
 *
 * Production route: `/settings/subscription`. Authed. Priority P1.
 * Current plan, payment method, invoices, cancel.
 */
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Receipt, AlertTriangle } from 'lucide-react';
import {
  PageHeader,
  Section,
  Skeleton,
  StatChip,
  InlineError,
} from './_primitives';

const INVOICES = [
  { date: 'Jun 12, 2026', amount: '$39.00', status: 'paid' },
  { date: 'Jun 12, 2025', amount: '$39.00', status: 'paid' },
  { date: 'Jun 12, 2024', amount: '$19.00', status: 'paid' },
];

export default function SubscriptionWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as
    | 'empty'
    | 'loading'
    | 'error'
    | 'success';

  if (state === 'empty') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Subscription" title="You're on the Free plan" />
        <div className="card flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">No active subscription</p>
            <p className="text-xs text-surface-fg-muted">
              Upgrade to Pro for tendon insights and friends {`>`} 5.
            </p>
          </div>
          <a className="btn-primary" href="/wireframes/paywall">
            Upgrade
          </a>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Subscription" title="Subscription" />
        <Skeleton variant="block" className="h-32" />
        <Skeleton variant="block" className="h-48" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Subscription" title="Subscription" />
        <InlineError
          title="Couldn't load your subscription"
          body="Try again in a moment — your plan is unchanged."
          retryHref="/wireframes/subscription"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Subscription"
        title="Pro · annual"
        description="Renews Jun 12, 2027. $39 / year."
      />

      <Section>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip label="Plan" value="Pro annual" tone="success" />
          <StatChip label="Renews" value="Jun 12, 2027" />
          <StatChip label="Since" value="Jun 12, 2024" />
          <StatChip label="Method" value="Visa ··4242" />
        </div>
      </Section>

      <Section title="Manage">
        <div className="card space-y-3">
          <button className="btn-ghost w-full justify-between" type="button">
            <span className="flex items-center gap-2">
              <CreditCard aria-hidden className="h-4 w-4" /> Update payment
              method
            </span>
            <span aria-hidden>→</span>
          </button>
          <button className="btn-ghost w-full justify-between" type="button">
            <span className="flex items-center gap-2">
              <Receipt aria-hidden className="h-4 w-4" /> Download invoices
            </span>
            <span aria-hidden>→</span>
          </button>
          <button
            className="btn-danger w-full justify-between"
            type="button"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-4 w-4" /> Cancel Pro
            </span>
            <span aria-hidden>→</span>
          </button>
        </div>
      </Section>

      <Section title="Invoices">
        <div className="card divide-y divide-surface-border">
          {INVOICES.map((inv) => (
            <div
              key={inv.date}
              className="flex items-center justify-between py-3 text-sm"
            >
              <div>
                <p className="font-medium">{inv.date}</p>
                <p className="text-xs text-surface-fg-subtle">
                  Pro · annual
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums">{inv.amount}</span>
                <span className="chip text-success">{inv.status}</span>
                <a
                  className="btn-ghost"
                  href="/wireframes/subscription"
                  aria-label={`Download invoice from ${inv.date}`}
                >
                  PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div data-dev="true" className="border-t border-dashed border-surface-border pt-4 text-xs text-surface-fg-subtle">
        <span className="font-semibold uppercase tracking-wide">State:</span>{' '}
        {(['empty', 'loading', 'error', 'success'] as const).map((s, i) => (
          <span key={s}>
            <a
              className={state === s ? 'text-primary' : 'underline'}
              href={`/wireframes/subscription?state=${s}`}
            >
              {s}
            </a>
            {i < 3 ? ' · ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}