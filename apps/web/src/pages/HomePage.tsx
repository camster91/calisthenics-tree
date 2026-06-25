/**
 * HomePage — DAG browse (Phase 2).
 *
 * Shows the user's current node in each of the 3 trees (Vertical Push /
 * Horizontal Pull / Core), plus a "Start workout" CTA per tree that
 * deep-links to /workout/<node_id>.
 *
 * Phase 1.5 placeholder had a hero + trees preview. Phase 2 replaces
 * that with a real, data-driven view. The hero stays for first-visit
 * marketing feel, then collapses into a "you're on <X> in <tree>" CTA
 * once progressions are loaded.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Mountain, Anchor, ChevronRight, Loader2 } from 'lucide-react';

import {
  getHealth,
  getMyProgressions,
  type ActiveProgression,
} from '../lib/api';

const TREE_ICONS: Record<string, typeof Flame> = {
  push_handstand_pushup_path: Mountain,
  pull_front_lever_path: Flame,
  core_dragon_flag_path: Anchor,
};

export default function HomePage() {
  const [health, setHealth] = useState<string>('checking…');
  const [progressions, setProgressions] = useState<ActiveProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getHealth()
        .then((r) => !cancelled && setHealth(r.status))
        .catch((e) => !cancelled && setError(`health: ${e.message}`)),
      getMyProgressions()
        .then((r) => !cancelled && setProgressions(r.active_progressions))
        .catch((e) =>
          !cancelled && setError(`progressions: ${e.message}`),
        ),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-12">
      <section className="space-y-4 text-balance">
        <p className="chip">Your training</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Pick up where you left off.
        </h1>
        <p className="max-w-xl text-lg text-surface-fg-muted">
          Three trees. One current node each. Log a workout to unlock the
          next rung, or regress if the load is too high today.
        </p>
      </section>

      {error && (
        <section
          className="card border-danger/30 bg-danger/5 p-3 text-sm text-danger"
          role="alert"
        >
          {error}. Start the API with{' '}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">
            docker compose up
          </code>{' '}
          from the project root.
        </section>
      )}

      <section
        aria-labelledby="progressions-heading"
        className="space-y-4"
        data-testid="home-progressions"
      >
        <h2 id="progressions-heading" className="text-2xl font-semibold">
          Your progressions
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-fg-muted">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            Loading your trees…
          </div>
        ) : progressions.length === 0 ? (
          <div className="card space-y-3 text-sm text-surface-fg-muted">
            <p>
              No progressions yet. If you just completed onboarding, try
              refreshing — otherwise contact support.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
            {progressions.map((p) => {
              const Icon =
                TREE_ICONS[p.tree_name.toLowerCase().replace(/\s+/g, '_')] ??
                Flame;
              const cn = p.current_node;
              return (
                <li key={p.tree_id} className="card flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-base font-semibold">{p.tree_name}</h3>
                  </div>

                  <div className="space-y-1">
                    <p
                      className="text-lg font-semibold leading-tight"
                      data-testid={`home-current-${p.tree_id}`}
                    >
                      {cn.exercise_name}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
                      Current node
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2 font-mono text-sm">
                    <span className="text-surface-fg">{cn.target_sets}×</span>
                    <span className="text-primary">
                      {cn.target_hold_secs
                        ? `${cn.target_hold_secs}s hold`
                        : `${cn.target_reps ?? '?'} reps`}
                    </span>
                    <span className="text-xs text-surface-fg-muted">
                      ({cn.movement_type})
                    </span>
                  </div>

                  <Link
                    to={`/workout/${encodeURIComponent(cn.node_id)}`}
                    className="btn-primary mt-auto inline-flex items-center justify-between gap-2"
                    data-testid={`home-start-${p.tree_id}`}
                  >
                    Start workout
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* API status — visible during Phase 2 dev */}
      <section className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-fg-muted">
          Backend status
        </h2>
        <p className="mt-2 font-mono text-sm">
          /healthz →{' '}
          <span className={health === 'ok' ? 'text-success' : 'text-warning'}>
            {health}
          </span>
        </p>
      </section>
    </div>
  );
}