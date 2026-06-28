/**
 * LandingPage — /welcome
 *
 * Public marketing page for anonymous visitors. Replaces the bare /login
 * redirect so visitors landing on calisthenics-tree.com get real context
 * before being asked to sign in.
 *
 * Phase 3 (PLAN.md) deliverable. Uses the existing design system
 * tokens — no new design work needed; this is copy + layout.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Heart,
  TrendingUp,
} from 'lucide-react';

import { Button } from '../components/ui/button';

const FEATURES = [
  {
    icon: GitBranch,
    title: 'A real skill tree',
    body: '30 nodes across 3 trees — Vertical Push, Horizontal Pull, Core. Each unlocks the next based on what you can actually do.',
  },
  {
    icon: TrendingUp,
    title: 'Placements that make sense',
    body: 'Three quick questions plus a sub-maximal push-up test, and you land on the rung that matches your level.',
  },
  {
    icon: Heart,
    title: 'Smart regressions',
    body: 'A 4-week rolling strain score per joint pathway. When you’re over 1.5× baseline, we suggest a regression — not another PR attempt.',
  },
];

export default function LandingPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-12"
    >
      {/* Hero — Fitness+ style big title */}
      <header className="space-y-6 text-balance">
        <p className="display-eyebrow">Calisthenics Tree</p>
        <h1 className="text-5xl font-bold leading-display tracking-tightest sm:text-7xl">
          A real skill tree for{' '}
          <span className="text-primary">calisthenics</span>.
        </h1>
        <p className="max-w-2xl text-lg leading-body text-surface-fg-muted sm:text-xl">
          Unlock planche, front lever, handstand — progression that makes
          sense, with smart regressions when you fatigue.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild variant="default" size="lg">
            <Link to="/onboarding/q1">
              Get started
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/login">I have an account</Link>
          </Button>
        </div>
      </header>

      {/* Features */}
      <section className="mt-20 space-y-6" aria-labelledby="features-heading">
        <h2 id="features-heading" className="display-eyebrow">
          What's inside
        </h2>
        <ul className="grid gap-5 sm:grid-cols-1 lg:grid-cols-3">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="spring-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="card flex h-full flex-col gap-3">
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"
                  >
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-bold tracking-tighter">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-body text-surface-fg-muted">
                    {f.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* What's not here (anti-features from DECISION.md) */}
      <section className="mt-16 space-y-3">
        <h2 className="display-eyebrow">What we don't do</h2>
        <ul className="space-y-2 text-base leading-body text-surface-fg-muted">
          <li className="flex items-start gap-2">
            <CheckCircle2
              aria-hidden
              className="mt-1 h-4 w-4 shrink-0 text-accent-success"
            />
            <span>No daily reminders or push notifications.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2
              aria-hidden
              className="mt-1 h-4 w-4 shrink-0 text-accent-success"
            />
            <span>No paywalled core features. Push-ups stay free.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2
              aria-hidden
              className="mt-1 h-4 w-4 shrink-0 text-accent-success"
            />
            <span>No computer-vision form check. We trust you.</span>
          </li>
        </ul>
      </section>

      <footer className="mt-20 flex flex-col items-start gap-4 border-t border-surface-border pt-8 text-xs text-surface-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <span>Calisthenics Tree — train smarter, not just harder.</span>
        <nav aria-label="Legal" className="flex gap-4">
          <Link to="/privacy" className="hover:text-surface-fg">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-surface-fg">
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}