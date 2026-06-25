/**
 * Wireframe — Landing / Marketing.
 *
 * Production route: `/` (for unauthenticated visitors).
 * T37 priority P2. Public.
 *
 * Low-fi: hero, value props, pricing teaser, CTA. No product UI, no DAG.
 */
import { ArrowRight, Flame, Mountain, Anchor } from 'lucide-react';
import { PageHeader, Section } from './_primitives';

export default function LandingWireframe() {
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="Calisthenics Tree"
        title="A real skill tree for calisthenics."
        description="Unlock planche, front lever, handstand — progression that makes sense, with smart regressions when you fatigue."
        actions={
          <>
            <a className="btn-primary" href="/onboarding/q1">
              Get started <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
            <a className="btn-ghost" href="/login">
              I have an account
            </a>
          </>
        }
      />

      {/* Three pillars — placeholder copy, real layout */}
      <Section title="Three paths, one tree.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              Icon: Mountain,
              title: 'Push',
              body: 'Pike push-up → handstand → handstand push-up.',
            },
            {
              Icon: Flame,
              title: 'Pull',
              body: 'Inverted row → front lever rows → full front lever.',
            },
            {
              Icon: Anchor,
              title: 'Core',
              body: 'Hollow hold → L-sit → dragon flag.',
            },
          ].map(({ Icon, title, body }) => (
            <article key={title} className="card space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
                <Icon aria-hidden className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-surface-fg-muted">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="card space-y-3">
            <p className="chip">Free</p>
            <h3 className="text-xl font-semibold">Browse + log workouts</h3>
            <p className="text-sm text-surface-fg-muted">
              Full access to the three trees. Unlimited logging. Friends list up
              to 5.
            </p>
            <a className="btn-ghost w-fit" href="/onboarding/q1">
              Start free
            </a>
          </article>
          <article className="card space-y-3 ring-2 ring-primary">
            <p className="chip bg-primary/15 text-primary">Pro</p>
            <h3 className="text-xl font-semibold">Tendon insights + social</h3>
            <p className="text-sm text-surface-fg-muted">
              Wrist/elbow/shoulder strain tracking. Friend challenges. Public
              profile. Unlimited friends.
            </p>
            <a className="btn-primary w-fit" href="/paywall">
              See plans
            </a>
          </article>
        </div>
      </Section>

      {/* Footer band */}
      <Section>
        <div className="card flex flex-col items-center gap-3 py-8 text-center">
          <h3 className="text-2xl font-semibold">Train smarter, not harder.</h3>
          <p className="max-w-md text-sm text-surface-fg-muted">
            Place your starting node in 90 seconds. The tree adjusts.
          </p>
          <a className="btn-primary" href="/onboarding/q1">
            Place me <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </Section>
    </div>
  );
}