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
      className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12"
    >
      {/* Hero */}
      <header className="space-y-6 text-balance">
        <p className="chip">Calisthenics Tree</p>
        <h1 className="text-4xl font-semibold leading-[1.1] sm:text-6xl">
          A real skill tree for{' '}
          <span className="text-primary">calisthenics</span>.
        </h1>
        <p className="max-w-2xl text-lg text-surface-fg-muted">
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
        <h2
          id="features-heading"
          className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted"
        >
          What's inside
        </h2>
        <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="card space-y-3">
                <Icon aria-hidden className="h-6 w-6 text-primary" />
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-surface-fg-muted">{f.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* What's not here (anti-features from DECISION.md) */}
      <section className="mt-16 space-y-3 text-sm text-surface-fg-muted">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          What we don't do
        </h2>
        <ul className="space-y-1">
          <li className="flex items-start gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>No daily reminders or push notifications.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>No paywalled core features. Push-ups stay free.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
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