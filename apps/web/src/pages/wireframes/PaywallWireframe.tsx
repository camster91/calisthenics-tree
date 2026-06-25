/**
 * Wireframe — Paywall.
 *
 * Production route: `/paywall`. Public (modal-screen). Priority P1.
 * Two plans. Pro featured. Annual default.
 */
import { Check, Sparkles } from 'lucide-react';
import { PageHeader, Section } from './_primitives';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    features: [
      'Three progression trees',
      'Unlimited workout logging',
      'Up to 5 friends',
    ],
    cta: 'Current plan',
    tone: 'ghost',
  },
  {
    name: 'Pro · monthly',
    price: '$4.99',
    cadence: '/ month',
    features: [
      'Tendon strain insights',
      'Unlimited friends + challenges',
      'Public profile + leaderboards',
      'Early access to new trees',
    ],
    cta: 'Choose monthly',
    tone: 'ghost',
  },
  {
    name: 'Pro · annual',
    price: '$39',
    cadence: '/ year',
    features: [
      'Everything in monthly',
      '2 months free vs monthly',
      'Priority support',
    ],
    cta: 'Choose annual',
    tone: 'primary',
    featured: true,
  },
];

export default function PaywallWireframe() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Upgrade"
        title="Train smarter with Pro."
        description="Tendon insights catch fatigue before it catches you. Friends + challenges for accountability."
      />

      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`card relative flex flex-col gap-4 ${
                p.featured ? 'ring-2 ring-primary' : ''
              }`}
            >
              {p.featured && (
                <span className="chip bg-primary text-primary-on self-start">
                  <Sparkles aria-hidden className="h-3 w-3" /> Best value
                </span>
              )}
              <header>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums">
                  {p.price}
                  <span className="ml-1 text-sm font-normal text-surface-fg-muted">
                    {p.cadence}
                  </span>
                </p>
              </header>
              <ul className="flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={p.tone === 'primary' ? 'btn-primary' : 'btn-ghost'}
              >
                {p.cta}
              </button>
            </article>
          ))}
        </div>
      </Section>

      <p className="text-center text-xs text-surface-fg-subtle">
        Cancel anytime · restore on any device via sign-in.
      </p>
    </div>
  );
}