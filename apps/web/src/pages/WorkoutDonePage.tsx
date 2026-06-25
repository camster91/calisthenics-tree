/**
 * WorkoutDonePage — /workout/:nodeId/done
 *
 * Shows the sync response: workout count, promotions, regressions.
 * Reads the sync response from router state (passed by WorkoutLogPage
 * after a successful POST). Falls back to "workout saved" if state
 * is missing (e.g. hard refresh).
 */
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

import type { WorkoutsSyncResponse } from '../lib/api';
import { Button } from '../components/ui/button';

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
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <CheckCircle2 aria-hidden className="h-12 w-12 text-success" />
        <h1 className="text-2xl font-semibold">Workout saved</h1>
        <p className="text-sm text-surface-fg-muted text-center max-w-md">
          We couldn't load the sync details (this can happen after a hard
          refresh). Your workout was recorded.
        </p>
        <Button asChild variant="default" size="lg">
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
      className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8"
      data-testid="workout-done"
    >
      <header className="space-y-2 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {exerciseName} — done
        </h1>
        <p className="text-sm text-surface-fg-muted">
          Synced {synced_workout_count} workout{synced_workout_count === 1 ? '' : 's'}.
        </p>
      </header>

      {hasUpdates && (
        <section
          aria-labelledby="updates-heading"
          className="card space-y-3"
        >
          <h2
            id="updates-heading"
            className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted"
          >
            Tree updates
          </h2>

          {promotionCount > 0 && (
            <ul className="space-y-2">
              {state_updates.promotions.map((u) => (
                <li
                  key={`${u.tree_id}-${u.new_node_id}`}
                  className="flex items-start gap-2 text-sm text-success"
                  data-testid="workout-done-promotion"
                >
                  <TrendingUp aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{u.reason}</span>
                </li>
              ))}
            </ul>
          )}

          {regressionCount > 0 && (
            <ul className="space-y-2">
              {state_updates.regressions.map((u) => (
                <li
                  key={`${u.tree_id}-${u.new_node_id}`}
                  className="flex items-start gap-2 text-sm text-warning"
                  data-testid="workout-done-regression"
                >
                  <TrendingDown aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{u.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!hasUpdates && (
        <p className="text-center text-sm text-surface-fg-muted">
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