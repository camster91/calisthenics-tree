/**
 * Wireframe — Workout Log.
 *
 * Production route: `/workout/:node_id`. Authed. Priority P0.
 * Multi-state — driven by ?state=. The high-priority screen for visual review.
 *
 * Why this matters: it's where the user spends 90% of in-app time. Layout
 * needs to be one-thumb reachable on a phone (Start/Stop/Log all in the
 * bottom 40% of the screen), and the rep counter has to be readable across
 * the room (gym-glare mode AAA contrast).
 */
import { useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Timer,
  Mountain,
} from 'lucide-react';
import {
  PageHeader,
  Section,
  EmptyState,
  InlineError,
  Skeleton,
  StatChip,
} from './_primitives';

export default function WorkoutLogWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as
    | 'empty'
    | 'loading'
    | 'error'
    | 'success';

  if (state === 'empty') {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Workout"
          title="No active node"
          description="Pick a node from the tree first."
        />
        <EmptyState
          icon={Mountain}
          title="Nothing to log"
          body="Pick a node from your active tree, or run placement if you haven't yet."
          primaryCta={{ label: 'Open the tree', href: '/wireframes/home' }}
          secondaryCta={{ label: 'Place me', href: '/onboarding/q1' }}
        />
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Workout" title="Loading…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton variant="block" className="h-48" />
          <Skeleton variant="block" className="h-48" />
        </div>
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Workout" title="Pike push-up" />
        <InlineError
          title="Couldn't save that set"
          body="The set is buffered locally — we'll retry every 30 seconds."
          retryHref="/wireframes/workout-log?state=success"
        />
      </div>
    );
  }

  // success — the real layout
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workout · set 2 of 3"
        title="Pike push-up"
        description="3 × 8 · RIR-2 target · 3-1-3 tempo"
        actions={
          <a className="btn-ghost" href="/wireframes/home">
            <ChevronUp aria-hidden className="h-4 w-4" /> Switch node
          </a>
        }
      />

      {/* Big rep counter — gym-glare readable */}
      <Section>
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <p className="chip">Reps</p>
          <div
            aria-live="polite"
            className="font-mono text-8xl font-bold leading-none tracking-tighter text-primary tabular-nums sm:text-9xl"
          >
            07
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-12 w-12 rounded-full p-0" aria-label="Decrement">
              <ChevronDown aria-hidden className="h-6 w-6" />
            </button>
            <button className="btn-ghost h-12 w-12 rounded-full p-0" aria-label="Reset">
              <RotateCcw aria-hidden className="h-5 w-5" />
            </button>
            <button className="btn-ghost h-12 w-12 rounded-full p-0" aria-label="Increment">
              <ChevronUp aria-hidden className="h-6 w-6" />
            </button>
          </div>
        </div>
      </Section>

      {/* Timer — collapsed by default, expandable. Inline, not a separate route. */}
      <Section>
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info/15 text-info ring-1 ring-info/40">
              <Timer aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-surface-fg-subtle">
                Set timer
              </p>
              <p className="font-mono text-lg tabular-nums">02:14 / 03:00</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost h-12 w-12 rounded-full p-0" aria-label="Pause">
              <Pause aria-hidden className="h-5 w-5" />
            </button>
            <button className="btn-primary h-12 w-12 rounded-full p-0" aria-label="Resume">
              <Play aria-hidden className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Section>

      {/* Set log — current set in progress */}
      <Section title="Today's sets">
        <div className="card divide-y divide-surface-border">
          {[
            { n: 1, reps: 8, rir: 2, done: true },
            { n: 2, reps: 7, rir: null, done: false, current: true },
            { n: 3, reps: null, rir: null, done: false },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex items-center justify-between gap-3 py-3 ${
                s.current ? 'bg-primary/5 -mx-4 px-4' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold ${
                    s.done
                      ? 'bg-success/20 text-success'
                      : s.current
                        ? 'bg-primary text-primary-on'
                        : 'bg-surface-muted text-surface-fg-subtle'
                  }`}
                >
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    Set {s.n} {s.current && '· in progress'}
                  </p>
                  <p className="text-xs text-surface-fg-subtle">
                    Target 8 reps @ RIR-2
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.reps !== null ? (
                  <StatChip label="Reps" value={String(s.reps)} />
                ) : (
                  <span className="text-xs text-surface-fg-subtle">—</span>
                )}
                {s.rir !== null && <StatChip label="RIR" value={String(s.rir)} tone="success" />}
                {s.done && <Check aria-hidden className="h-5 w-5 text-success" />}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Primary CTA — wireframe shows it at the natural document position
          (not sticky), because this is a low-fi review surface rendered on
          desktop. A real production phone build would re-add sticky bottom-0. */}
      <div className="-mx-4 border-t border-surface-border bg-surface-subtle px-4 py-3">
        <div className="flex gap-2">
          <button className="btn-ghost flex-1">Save draft</button>
          <a className="btn-primary flex-1" href="/wireframes/workout-done">
            Finish workout <Check aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* State picker — dev annotation, hidden in production via data-dev attribute. */}
      <div
        data-dev="true"
        className="border-t border-dashed border-surface-border pt-4 text-xs text-surface-fg-subtle"
      >
        <span className="font-semibold uppercase tracking-wide">State:</span>{' '}
        {(['empty', 'loading', 'error', 'success'] as const).map((s, i) => (
          <span key={s}>
            <a
              className={state === s ? 'text-primary' : 'underline'}
              href={`/wireframes/workout-log?state=${s}`}
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