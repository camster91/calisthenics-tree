/**
 * WorkoutLogPage — /workout/:nodeId
 *
 * Loads node details (exercise name + target sets/reps/hold), tracks
 * sets via RepCounter (isotonic) or WorkoutTimer (isometric), then POSTs
 * the completed workout to /api/v1/workouts/sync on save. State updates
 * (promotions/regressions) are passed to the done screen.
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Hero card with exercise name + BigNumber target (Fitness+-style
 *   focal counter)
 * - Persistent progress strip at the top showing X of N sets
 * - Per-set cards keep the RepCounter / WorkoutTimer; check button
 *   promoted to a primary full-width CTA per set (was a ghost button)
 * - Save CTA at the bottom is a full-width sticky-feeling primary button
 * - Set checklist stays visible (was at bottom, now in the middle)
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2, Save, Check } from 'lucide-react';

import {
  api,
  ApiError,
  syncWorkouts,
  type SyncedSet,
  type SyncedWorkout,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { track } from '../lib/analytics';
import { Card } from '../components/ui/card';
import { BigNumber } from '../components/ui/big-number';
import { RepCounter } from '../components/workout/RepCounter';
import { WorkoutTimer } from '../components/workout/WorkoutTimer';
import { SetChecklist } from '../components/workout/SetChecklist';

interface NodeDetail {
  node_id: string;
  exercise_name: string;
  movement_type: 'isotonic' | 'isometric';
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
}

type Status = 'loading' | 'ready' | 'saving' | 'error';

function uuidv4(): string {
  // Web Crypto with a manual fallback. We only need uniqueness for the
  // idempotency token on the workouts/sync endpoint.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4-ish fallback (sufficient for idempotency, not for crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function WorkoutLogPage() {
  const navigate = useNavigate();
  const { nodeId = '' } = useParams<{ nodeId: string }>();

  const [node, setNode] = useState<NodeDetail | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sets are tracked as either:
  //   isotonic: { reps: number }                — captured via RepCounter
  //   isometric: { hold_secs: target_hold_secs } — captured on timer finish
  // Completed indices for the SetChecklist.
  const [completed, setCompleted] = useState<number[]>([]);
  const [repValues, setRepValues] = useState<number[]>([]);
  const [holdValues, setHoldValues] = useState<number[]>([]);

  // Load node details on mount.
  useEffect(() => {
    if (!nodeId) return;
    let cancelled = false;
    setStatus('loading');
    setErrorMsg(null);

    api<NodeDetail>(`/nodes/${encodeURIComponent(nodeId)}`, {
      skipAuth: true, // public read; matches /api/v1/nodes design
    })
      .then((n) => {
        if (cancelled) return;
        setNode(n);
        setRepValues(new Array(n.target_sets).fill(0));
        setHoldValues(new Array(n.target_sets).fill(n.target_hold_secs ?? 0));
        setCompleted([]);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `${err.status} ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setErrorMsg(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  const isIsometric = node?.movement_type === 'isometric';
  const totalSets = node?.target_sets ?? 0;
  const canSave = completed.length > 0 && status !== 'saving';

  const handleSave = useCallback(async () => {
    if (!node || !canSave) return;
    setStatus('saving');
    setErrorMsg(null);

    if (completed.length === 0) {
      setStatus('ready');
      return;
    }

    const filledSets: SyncedSet[] = completed.map((idx) => ({
      set_number: idx + 1,
      reps: isIsometric ? null : repValues[idx] || null,
      hold_secs: isIsometric ? holdValues[idx] || null : null,
    }));

    const workout: SyncedWorkout = {
      client_workout_id: uuidv4(),
      completed_at: new Date().toISOString(),
      logs: [
        {
          node_id: node.node_id,
          sets: filledSets,
        },
      ],
    };

    try {
      const response = await syncWorkouts({
        sync_client_timestamp: new Date().toISOString(),
        workouts: [workout],
      });
      // Sprint 38 YELLOW fix: funnel analytics — workouts are the
      // critical conversion event. Fire-and-forget; never block the UX.
      track('workout_logged', {
        node_id: node.node_id,
        exercise_name: node.exercise_name,
        movement_type: node.movement_type,
        sets_completed: completed.length,
        promoted: response.state_updates.promotions.length,
        regressed: response.state_updates.regressions.length,
      });
      navigate(`/workout/${encodeURIComponent(node.node_id)}/done`, {
        state: { response, exerciseName: node.exercise_name },
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setErrorMsg(msg);
      setStatus('ready');
    }
  }, [node, canSave, completed, isIsometric, repValues, holdValues, navigate]);

  if (status === 'loading' || !node) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-4 py-8"
      >
        {status === 'error' ? (
          <>
            <AlertCircle aria-hidden className="h-8 w-8 text-danger" />
            <p className="text-sm text-danger">{errorMsg}</p>
            <Button asChild variant="ghost">
              <a href="/">Back to home</a>
            </Button>
          </>
        ) : (
          <>
            <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-surface-fg-muted">Loading workout…</p>
          </>
        )}
      </main>
    );
  }

  return (
    <main
      id="main"
      className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8 pb-32"
      data-testid="workout-log"
    >
      {/* Hero card — exercise name + BigNumber target (Apple Fitness+ focal counter) */}
      <Card variant="hero" className="space-y-4">
        <p className="display-eyebrow">
          {node.movement_type === 'isometric' ? 'Hold workout' : 'Reps workout'}
        </p>
        <h1 className="text-3xl font-bold leading-heading tracking-tighter sm:text-4xl">
          {node.exercise_name}
        </h1>
        <div className="flex items-baseline gap-3">
          <BigNumber size="2xl" tone="primary">
            {isIsometric
              ? `${node.target_hold_secs ?? 0}`
              : `${node.target_reps ?? '?'}`}
          </BigNumber>
          <div className="space-y-0.5">
            <p className="text-base font-semibold tracking-tight text-surface-fg">
              {node.target_sets}× sets
            </p>
            <p className="text-sm text-surface-fg-muted">
              {isIsometric ? 'seconds hold' : 'reps per set'} ·{' '}
              {node.movement_type}
            </p>
          </div>
        </div>

        {/* Progress strip — Apple-style progress dots + counter */}
        <div
          className="flex items-center gap-3 pt-2"
          role="status"
          aria-label={`${completed.length} of ${totalSets} sets complete`}
        >
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: totalSets }, (_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  completed.includes(idx)
                    ? 'bg-primary'
                    : 'bg-surface-muted'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold tabular-nums text-surface-fg">
            {completed.length} / {totalSets}
          </span>
        </div>
      </Card>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      <section aria-labelledby="sets-heading" className="space-y-3">
        <h2
          id="sets-heading"
          className="display-eyebrow"
        >
          Sets
        </h2>
        <ol className="space-y-3">
          {Array.from({ length: totalSets }, (_, idx) => {
            const isDone = completed.includes(idx);
            return (
              <li
                key={idx}
                className="card space-y-3"
                data-testid={`workout-set-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold tracking-tighter text-surface-fg">
                    Set {idx + 1}
                  </span>
                  <span className="text-sm tabular-nums text-surface-fg-muted">
                    Target:{' '}
                    {node.target_hold_secs
                      ? `${node.target_hold_secs}s`
                      : `${node.target_reps ?? '?'} reps`}
                  </span>
                </div>

                {isIsometric ? (
                  <WorkoutTimer
                    durationSecs={node.target_hold_secs ?? 0}
                    label={`Hold for ${node.target_hold_secs ?? 0}s`}
                    onFinish={() => {
                      // Mark this set complete with the target hold duration.
                      setHoldValues((prev) => {
                        const next = [...prev];
                        next[idx] = node.target_hold_secs ?? 0;
                        return next;
                      });
                      setCompleted((prev) =>
                        prev.includes(idx) ? prev : [...prev, idx],
                      );
                    }}
                  />
                ) : (
                  <RepCounter
                    value={repValues[idx] ?? 0}
                    min={0}
                    max={999}
                    label={`${node.target_reps ?? '?'} reps target`}
                    onChange={(v) =>
                      setRepValues((prev) => {
                        const next = [...prev];
                        next[idx] = v;
                        return next;
                      })
                    }
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    setCompleted((prev) =>
                      prev.includes(idx)
                        ? prev.filter((i) => i !== idx)
                        : [...prev, idx],
                    )
                  }
                  className={`btn w-full text-sm font-semibold transition-all ${
                    isDone
                      ? 'bg-accent-success text-black hover:bg-accent-success/90'
                      : ''
                  }`}
                  data-testid={`workout-set-toggle-${idx}`}
                  aria-pressed={isDone}
                >
                  {isDone ? (
                    <>
                      <Check aria-hidden className="h-4 w-4" />
                      Marked complete — tap to undo
                    </>
                  ) : (
                    'Mark set complete'
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <SetChecklist
        total={totalSets}
        completed={completed}
        onChange={(next) => setCompleted(next)}
      />

      {/* Sticky-feel save bar — full-width primary CTA at the bottom */}
      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-surface-border bg-surface/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button asChild variant="ghost" size="md">
            <a href="/" className="text-surface-fg-muted">
              Cancel
            </a>
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="workout-save"
            className="min-w-[180px]"
          >
            {status === 'saving' ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save aria-hidden className="h-4 w-4" />
                Save workout
                <ArrowRight aria-hidden className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}