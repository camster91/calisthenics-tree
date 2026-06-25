/**
 * Wireframe Index — `/wireframes`
 *
 * Review surface for T37. Lists every wireframe with a tile, route, and
 * priority badge. Drives the Playwright screenshot pass.
 */
import { Link } from 'react-router-dom';
import {
  Mountain,
  Flame,
  Anchor,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface WireframeMeta {
  name: string;
  title: string;
  path: string;
  priority: 'P0' | 'P1' | 'P2';
  states: string;
  Icon: LucideIcon;
  note?: string;
}

const WIREFRAMES: WireframeMeta[] = [
  {
    name: 'landing',
    title: 'Landing / marketing',
    path: '/wireframes/landing',
    priority: 'P2',
    states: 'success',
    Icon: Sparkles,
    note: 'Public. Hero + 3 pillars + pricing.',
  },
  {
    name: 'login',
    title: 'Login',
    path: '/wireframes/login',
    priority: 'P1',
    states: 'empty · error',
    Icon: Sparkles,
  },
  {
    name: 'onboarding-q1',
    title: 'Onboarding Q1 — pull-up?',
    path: '/wireframes/onboarding-q1',
    priority: 'P0',
    states: 'success',
    Icon: Flame,
    note: 'Branches to q2 (yes) or q3 (no).',
  },
  {
    name: 'onboarding-q2',
    title: 'Onboarding Q2 — reps',
    path: '/wireframes/onboarding-q2',
    priority: 'P0',
    states: 'success',
    Icon: Flame,
  },
  {
    name: 'onboarding-q3',
    title: 'Onboarding Q3 — alternate',
    path: '/wireframes/onboarding-q3',
    priority: 'P0',
    states: 'success',
    Icon: Flame,
  },
  {
    name: 'onboarding-test',
    title: 'Onboarding RIR-2 test',
    path: '/wireframes/onboarding-test',
    priority: 'P0',
    states: 'empty · loading · success',
    Icon: Flame,
    note: 'Driven by ?state=',
  },
  {
    name: 'onboarding-result',
    title: 'Onboarding placement result',
    path: '/wireframes/onboarding-result',
    priority: 'P0',
    states: 'success',
    Icon: Flame,
  },
  {
    name: 'home',
    title: 'Home — DAG browse',
    path: '/wireframes/home',
    priority: 'P0',
    states: 'empty · loading · error · success',
    Icon: Mountain,
    note: 'Multi-state. Real DAG ships in T35.',
  },
  {
    name: 'workout-log',
    title: 'Workout log',
    path: '/wireframes/workout-log',
    priority: 'P0',
    states: 'empty · loading · error · success',
    Icon: Flame,
    note: 'Big rep counter, gym-glare readable.',
  },
  {
    name: 'workout-done',
    title: 'Workout complete',
    path: '/wireframes/workout-done',
    priority: 'P0',
    states: 'success',
    Icon: Flame,
  },
  {
    name: 'feed',
    title: 'Social feed',
    path: '/wireframes/feed',
    priority: 'P1',
    states: 'empty · loading · success',
    Icon: Sparkles,
  },
  {
    name: 'friend-profile',
    title: 'Friend profile',
    path: '/wireframes/friend-profile',
    priority: 'P2',
    states: 'loading · success',
    Icon: Sparkles,
  },
  {
    name: 'tendon-insight',
    title: 'Tendon strain detail',
    path: '/wireframes/tendon-insight',
    priority: 'P1',
    states: 'loading · success',
    Icon: Sparkles,
    note: 'Pro-only. 14-day sparkline.',
  },
  {
    name: 'settings',
    title: 'Settings',
    path: '/wireframes/settings',
    priority: 'P2',
    states: 'success',
    Icon: Sparkles,
  },
  {
    name: 'paywall',
    title: 'Paywall',
    path: '/wireframes/paywall',
    priority: 'P1',
    states: 'success',
    Icon: Sparkles,
  },
  {
    name: 'subscription',
    title: 'Subscription management',
    path: '/wireframes/subscription',
    priority: 'P1',
    states: 'empty · loading · error · success',
    Icon: Sparkles,
  },
  {
    name: 'empty-states',
    title: 'Empty state patterns',
    path: '/wireframes/empty-states',
    priority: 'P1',
    states: 'success',
    Icon: Anchor,
    note: 'Reusable across home/feed/workout-log.',
  },
];

const PRIORITY_TONES: Record<WireframeMeta['priority'], string> = {
  P0: 'bg-primary/15 text-primary ring-1 ring-primary/40',
  P1: 'bg-info/15 text-info ring-1 ring-info/40',
  P2: 'bg-surface-muted text-surface-fg-muted ring-1 ring-surface-border',
};

function TileBadge({ w }: { w: WireframeMeta }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40 transition-shadow group-hover:shadow-glow">
        <w.Icon aria-hidden className="h-5 w-5" />
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_TONES[w.priority]}`}
      >
        {w.priority}
      </span>
    </div>
  );
}

export default function WireframesIndex() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-balance">
        <p className="chip">T37 wireframes · review surface</p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          16 screens + 1 pattern page.
        </h1>
        <p className="max-w-2xl text-base text-surface-fg-muted">
          Every v1 screen rendered with real components, real tokens, and
          placeholder content. Open any tile to review. Multi-state screens
          have a query-string state switcher.
        </p>
        <p className="text-xs text-surface-fg-subtle">
          Priority legend:{' '}
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-primary">
            P0 critical path
          </span>{' '}
          ·{' '}
          <span className="rounded-full bg-info/15 px-1.5 py-0.5 text-info">
            P1 standard
          </span>{' '}
          ·{' '}
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-surface-fg-muted">
            P2 polish
          </span>
        </p>
      </header>

      <section className="space-y-8">
        {/* Onboarding subsection — 5 screens, visually grouped */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-fg-muted">
            Onboarding flow · 5 screens
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIREFRAMES.filter((w) => w.name.startsWith('onboarding-')).map((w) => (
              <Link
                key={w.name}
                to={w.path}
                className="card group flex h-full flex-col gap-3 transition-colors hover:bg-surface-muted"
              >
                <TileBadge w={w} />
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-semibold leading-snug">
                    {w.title}
                  </h3>
                  <p className="font-mono text-xs text-surface-fg-subtle">
                    {w.path}
                  </p>
                  <p className="text-xs text-surface-fg-muted">
                    States: {w.states}
                  </p>
                  {w.note && (
                    <p className="text-xs text-surface-fg-subtle">{w.note}</p>
                  )}
                </div>
                <span className="mt-auto text-xs font-medium text-primary group-hover:underline">
                  Open wireframe →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Main app screens */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-fg-muted">
            Main app · 11 screens
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIREFRAMES.filter(
              (w) =>
                !w.name.startsWith('onboarding-') &&
                !w.name.startsWith('empty-'),
            ).map((w) => (
              <Link
                key={w.name}
                to={w.path}
                className="card group flex h-full flex-col gap-3 transition-colors hover:bg-surface-muted"
              >
                <TileBadge w={w} />
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-semibold leading-snug">
                    {w.title}
                  </h3>
                  <p className="font-mono text-xs text-surface-fg-subtle">
                    {w.path}
                  </p>
                  <p className="text-xs text-surface-fg-muted">
                    States: {w.states}
                  </p>
                  {w.note && (
                    <p className="text-xs text-surface-fg-subtle">{w.note}</p>
                  )}
                </div>
                <span className="mt-auto text-xs font-medium text-primary group-hover:underline">
                  Open wireframe →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Patterns */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-fg-muted">
            Component patterns
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIREFRAMES.filter((w) => w.name.startsWith('empty-')).map((w) => (
              <Link
                key={w.name}
                to={w.path}
                className="card group flex h-full flex-col gap-3 transition-colors hover:bg-surface-muted"
              >
                <TileBadge w={w} />
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-semibold leading-snug">
                    {w.title}
                  </h3>
                  <p className="font-mono text-xs text-surface-fg-subtle">
                    {w.path}
                  </p>
                  <p className="text-xs text-surface-fg-muted">
                    States: {w.states}
                  </p>
                  {w.note && (
                    <p className="text-xs text-surface-fg-subtle">{w.note}</p>
                  )}
                </div>
                <span className="mt-auto text-xs font-medium text-primary group-hover:underline">
                  Open pattern →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 bg-surface-muted">
        <div>
          <p className="text-sm font-semibold">Iteration budget</p>
          <p className="text-xs text-surface-fg-muted">
            5 vision rounds per high-priority screen (home, workout log,
            onboarding). Secondary screens ship the first pass.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="chip">P0 · 8 screens</span>
          <span className="chip">P1 · 6 screens</span>
          <span className="chip">P2 · 3 screens</span>
          <span className="chip">Patterns · 1</span>
        </div>
      </section>
    </div>
  );
}