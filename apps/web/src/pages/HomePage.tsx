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
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Hero section uses display-section typography (text-5xl, font-bold,
 *   tracking-tighter) for the page title — was font-semibold text-4xl
 * - Each progression card uses the new 'hero' Card variant (squircle
 *   28px, glow shadow, primary accent ring) for the focal current node
 * - BigNumber used for the target_hold_secs / target_reps display
 * - "Start workout" CTA is a full-width squircle primary button
 * - Empty state is a hero card with prominent onboarding CTA
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';

import {
  getHealth,
  getMyProgressions,
  type ActiveProgression,
} from '../lib/api';
import { Card } from '../components/ui/card';
import { BigNumber } from '../components/ui/big-number';
import { EmptyState } from '../components/ui/empty-state';
import { TreeSigil } from '../components/brand/TreeSigil';
import { MOVEMENT_COLOR, movementFor } from '../lib/movement';

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
      <section className="space-y-3 text-balance">
        <p className="display-eyebrow">Your training</p>
        <h1 className="display-section text-5xl sm:text-6xl">
          Pick up where you left off.
        </h1>
        <p className="max-w-xl text-lg leading-body text-surface-fg-muted">
          Four trees. One current node each. Hit every target set to unlock
          the next rung.
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
        className="space-y-5"
        data-testid="home-progressions"
      >
        <h2
          id="progressions-heading"
          className="display-section text-3xl"
        >
          Your progressions
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-fg-muted">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            Loading your trees…
          </div>
        ) : progressions.length === 0 ? (
          <EmptyState
            message="No progressions yet. Find your level to get a starting rung on each tree."
            hint="Two quick questions and one push-up set. No equipment needed."
            action={{
              label: 'Find your level',
              to: '/onboarding/q1',
              testId: 'home-empty-start-onboarding',
            }}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {progressions.map((p, idx) => {
              const movement = movementFor(p.tree_id, p.tree_name);
              const accent = movement ? MOVEMENT_COLOR[movement] : 'var(--color-primary)';
              const cn = p.current_node;
              const isHold = typeof cn.target_hold_secs === 'number';
              return (
                <li
                  key={p.tree_id}
                  className="spring-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <Card
                    variant="default"
                    className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl p-5"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 30%, transparent)` }}
                    data-testid={`home-card-${p.tree_id}`}
                  >
                    {/* Thin movement-colour rule along the top edge. */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="flex items-center gap-3">
                      {movement && <TreeSigil movement={movement} size={40} />}
                      <h3 className="text-lg font-semibold">
                        {p.tree_name}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      <p
                        className="text-2xl font-bold leading-heading tracking-tighter text-surface-fg"
                        data-testid={`home-current-${p.tree_id}`}
                      >
                        {cn.exercise_name}
                      </p>
                      <p className="display-eyebrow">Current node</p>
                    </div>

                    {/* Big-number target — Apple Fitness+ style focal counter */}
                    <div className="flex items-baseline gap-3">
                      <BigNumber
                        size="xl"
                        style={{ color: accent }}
                        data-testid={`home-target-${p.tree_id}`}
                      >
                        {isHold
                          ? `${cn.target_hold_secs}`
                          : `${cn.target_reps ?? '?'}`}
                      </BigNumber>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold tracking-tight text-surface-fg">
                          {cn.target_sets}× sets
                        </p>
                        <p className="text-xs text-surface-fg-muted">
                          {isHold ? 'seconds hold' : 'reps'} ·{' '}
                          {cn.movement_type}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/workout/${encodeURIComponent(cn.node_id)}`}
                      className="btn-primary mt-auto inline-flex w-full items-center justify-center gap-2"
                      data-testid={`home-start-${p.tree_id}`}
                    >
                      Start workout
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    </Link>

                    <Link
                      to={`/tree/${encodeURIComponent(p.tree_id)}`}
                      className="inline-flex items-center justify-center text-sm font-medium text-surface-fg-muted transition-colors hover:text-surface-fg"
                      data-testid={`home-view-${p.tree_id}`}
                    >
                      View full tree →
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* API status — visible during Phase 2 dev */}
      <section className="card">
        <h2 className="display-eyebrow">Backend status</h2>
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