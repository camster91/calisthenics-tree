/**
 * Wireframe — Home (DAG browse default).
 *
 * Production route: `/` (for authed users). Priority P0.
 * Multi-state — driven by ?state=.
 *   empty    : first-run, no progressions yet
 *   loading  : skeletons
 *   error    : backend down
 *   success  : real DAG browse (placeholder content here)
 */
import { useSearchParams } from 'react-router-dom';
import { Mountain, Flame, Anchor, ArrowRight } from 'lucide-react';
import {
  PageHeader,
  Section,
  EmptyState,
  InlineError,
  Skeleton,
  PlaceholderDAG,
  StatChip,
  Spinner,
} from './_primitives';

const TREES = [
  {
    slug: 'push_handstand_pushup_path',
    name: 'Push → Handstand Push-up',
    Icon: Mountain,
    current: 'Pike push-up (3×8)',
    unlocked: 4,
    locked: 8,
    accent: 'text-primary',
  },
  {
    slug: 'pull_front_lever_path',
    name: 'Pull → Front Lever',
    Icon: Flame,
    current: 'Inverted row (3×8)',
    unlocked: 3,
    locked: 9,
    accent: 'text-primary',
  },
  {
    slug: 'core_dragon_flag_path',
    name: 'Core → Dragon Flag',
    Icon: Anchor,
    current: 'Hollow hold 20s',
    unlocked: 2,
    locked: 6,
    accent: 'text-primary',
  },
];

export default function HomeWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as
    | 'empty'
    | 'loading'
    | 'error'
    | 'success';

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Browse the tree"
        title="Your three progressions"
        description="Pick a tree to log a workout, or jump to the next available node."
        actions={
          <a className="btn-primary" href="/wireframes/workout-log">
            Log a workout <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        }
      />

      {state === 'empty' && (
        <EmptyState
          icon={Mountain}
          title="No trees unlocked yet"
          body="Run the 90-second placement to set your starting nodes on each tree."
          primaryCta={{ label: 'Place me', href: '/onboarding/q1' }}
          secondaryCta={{ label: 'Browse anyway', href: '/wireframes/home?state=success' }}
        />
      )}

      {state === 'loading' && (
        <Section>
          <div className="grid gap-4 sm:grid-cols-3">
            {TREES.map((t) => (
              <div key={t.slug} className="card space-y-3">
                <Skeleton variant="circle" />
                <Skeleton variant="line" className="w-2/3" />
                <Skeleton variant="line" className="w-1/2" />
                <Skeleton variant="block" className="h-16" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Skeleton variant="block" className="h-64" />
          </div>
        </Section>
      )}

      {state === 'error' && (
        <Section>
          <InlineError
            title="Couldn't reach the server"
            body="Pull-to-refresh, or check your connection. Your last workouts are saved locally."
            retryHref="/wireframes/home?state=success"
          />
        </Section>
      )}

      {state === 'success' && (
        <>
          {/* Tree cards */}
          <Section title="Active progressions">
            <div className="grid gap-4 sm:grid-cols-3">
              {TREES.map((t) => (
                <article key={t.slug} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40 ${t.accent}`}
                    >
                      <t.Icon aria-hidden className="h-5 w-5" />
                    </div>
                    <span className="chip">
                      {t.unlocked}/{t.unlocked + t.locked}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-xs text-surface-fg-muted">Current</p>
                  <p className="font-mono text-sm">{t.current}</p>
                  <a className="btn-primary w-full" href="/wireframes/workout-log">
                    Log
                  </a>
                </article>
              ))}
            </div>
          </Section>

          {/* DAG placeholder */}
          <Section
            title="Path preview"
            description="Real DAG (T35) replaces this placeholder."
          >
            <PlaceholderDAG />
          </Section>

          {/* Quick stats */}
          <Section title="This week">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatChip label="Workouts" value="4" tone="success" />
              <StatChip label="Volume" value="148 reps" />
              <StatChip label="Tendon load" value="watch" tone="warning" />
              <StatChip label="Streak" value="12 days" />
            </div>
          </Section>
        </>
      )}

      <div
        data-dev="true"
        className="flex items-center justify-between border-t border-dashed border-surface-border pt-4 text-xs text-surface-fg-subtle"
      >
        <span>
          <span className="font-semibold uppercase tracking-wide">State:</span>{' '}
          {(['empty', 'loading', 'error', 'success'] as const).map((s, i) => (
            <span key={s}>
              <a
                className={state === s ? 'text-primary' : 'underline'}
                href={`/wireframes/home?state=${s}`}
              >
                {s}
              </a>
              {i < 3 ? ' · ' : ''}
            </span>
          ))}
        </span>
        <Spinner label="" />
      </div>
    </div>
  );
}