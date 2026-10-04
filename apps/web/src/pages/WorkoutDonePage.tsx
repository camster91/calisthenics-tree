/**
 * WorkoutDonePage — /workout/:nodeId/done
 *
 * Shows the sync response: workout count, promotions, regressions.
 * Reads the sync response from router state (passed by WorkoutLogPage
 * after a successful POST). Falls back to "workout saved" if state
 * is missing (e.g. hard refresh).
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Celebration hero with a giant check-circle in the success-green tone,
 *   animated with the spring-in keyframe
 * - Workout count rendered with BigNumber (3xl, primary tone) — the
 *   focal stat of the screen
 * - Tree update cards with hero variant (glow shadow) for promotion,
 *   outline variant for regression
 * - Bottom CTA cluster with primary 'Back to home' + ghost 'Log another'
 */
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

import type { WorkoutsSyncResponse } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { BigNumber } from '../components/ui/big-number';

/**
 * Decorative unlock-celebration burst behind the result. Dimmed, and
 * faded to black at the bottom so the stat cards and copy below stay AA.
 * Sits at z-index -1 inside the `isolate` main so it never covers content.
 */
function CelebrationBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden"
    >
      <img
        src="/brand/img/unlock-celebration.webp"
        width={1400}
        height={1871}
        alt=""
        decoding="async"
        className="h-full w-full object-cover object-[50%_45%] opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black" />
    </div>
  );
}

interface LocationState {
  response: WorkoutsSyncResponse;
  exerciseName?: string;
}

export default function WorkoutDonePage() {
  const { nodeId = '' } = useParams<{ nodeId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const response = state?.response;
  const exerciseName = state?.exerciseName ?? 'Workout';

  if (!response) {
    return (
      <main
        id="main"
        className="relative isolate mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-5 py-8"
      >
        <CelebrationBackdrop />
        <div
          aria-hidden
          className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent-success/15 text-accent-success spring-in"
        >
          <CheckCircle2 aria-hidden className="h-12 w-12" />
        </div>
        <h1 className="display-section text-4xl">
          Workout saved
        </h1>
        <p className="max-w-md text-center text-base text-surface-fg-muted">
          We couldn't load the sync details (this can happen after a hard
          refresh). Your workout was recorded.
        </p>
        <Button asChild variant="default" size="lg" className="mt-4">
          <Link to="/">
            Back to home
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      </main>
    );
  }

  const { synced_workout_count, state_updates } = response;
  const promotionCount = state_updates.promotions.length;
  const regressionCount = state_updates.regressions.length;
  const hasUpdates = promotionCount + regressionCount > 0;

  return (
    <main
      id="main"
      className="relative isolate mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8"
      data-testid="workout-done"
    >
      <CelebrationBackdrop />

      {/* Celebration hero */}
      <header className="flex flex-col items-center gap-4 pt-10 text-center">
        <div
          aria-hidden
          className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent-success/15 text-accent-success spring-in"
        >
          <CheckCircle2 aria-hidden className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-accent-success">Complete</p>
          <h1 className="display-hero text-balance text-5xl sm:text-6xl">
            {exerciseName}
          </h1>
        </div>
      </header>

      {/* Workout count stat — BigNumber focal */}
      <Card variant="hero" className="flex flex-col items-center gap-1 py-6">
        <BigNumber size="3xl" tone="primary">
          {synced_workout_count}
        </BigNumber>
        <p className="display-eyebrow">Workouts synced</p>
      </Card>

      {hasUpdates && (
        <section
          aria-labelledby="updates-heading"
          className="space-y-3"
        >
          <h2
            id="updates-heading"
            className="display-eyebrow"
          >
            Tree updates
          </h2>

          {promotionCount > 0 && (
            <ul className="space-y-2">
              {state_updates.promotions.map((u) => (
                <li
                  key={`${u.tree_id}-${u.new_node_id}`}
                  data-testid="workout-done-promotion"
                >
                  <Card
                    variant="default"
                    className="flex items-start gap-3 border-accent-success/30 bg-accent-success/5"
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-success/20 text-accent-success"
                    >
                      <TrendingUp className="h-5 w-5" />
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-accent-success">
                        Promoted
                      </p>
                      <p className="text-sm text-surface-fg">{u.reason}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {regressionCount > 0 && (
            <ul className="space-y-2">
              {state_updates.regressions.map((u) => (
                <li
                  key={`${u.tree_id}-${u.new_node_id}`}
                  data-testid="workout-done-regression"
                >
                  <Card
                    variant="default"
                    className="flex items-start gap-3 border-warning/30 bg-warning/5"
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning"
                    >
                      <TrendingDown className="h-5 w-5" />
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-warning">
                        Regressed
                      </p>
                      <p className="text-sm text-surface-fg">{u.reason}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!hasUpdates && (
        <p className="text-center text-base leading-body text-surface-fg-muted">
          No tree updates this time. Stay consistent — the next session is
          where progress happens.
        </p>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button asChild variant="default" size="lg">
          <Link to="/">
            Back to home
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/workout/${encodeURIComponent(nodeId)}`}>
            Log another set
          </Link>
        </Button>
      </div>
    </main>
  );
}