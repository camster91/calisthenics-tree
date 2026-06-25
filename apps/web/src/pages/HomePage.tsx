/**
 * HomePage — DAG browse default.
 *
 * Phase 1.5 placeholder. T35 will build the proper NodeTree component,
 * T37 will build proper wireframes, and T35/T37 will replace this.
 *
 * For now: a hero explaining what Calisthenics Tree is, plus a list of
 * the three progression trees seeded by the backend, so the visual
 * design system has something to render against.
 */
import { useEffect, useState } from 'react';
import { getHealth, type ActiveProgression, getMyProgressions } from '../lib/api';
import { Flame, Mountain, Anchor } from 'lucide-react';

const TREE_ICONS: Record<string, typeof Flame> = {
  push_handstand_pushup_path: Mountain,
  pull_front_lever_path: Flame,
  core_dragon_flag_path: Anchor,
};

export default function HomePage() {
  const [health, setHealth] = useState<string>('checking…');
  const [progressions, setProgressions] = useState<ActiveProgression[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((r) => !cancelled && setHealth(r.status))
      .catch((e) => !cancelled && setError(`health: ${e.message}`));
    getMyProgressions()
      .then((r) => !cancelled && setProgressions(r.progressions))
      .catch((e) => !cancelled && setError(`progressions: ${e.message}`));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-4 text-balance">
        <p className="chip">Phase 1.5 foundation</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          A real skill tree for{' '}
          <span className="text-primary">calisthenics</span>.
        </h1>
        <p className="max-w-xl text-lg text-surface-fg-muted">
          Unlock planche, front lever, handstand — progression that makes
          sense, with smart regressions when you fatigue.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a className="btn-primary" href="/onboarding/q1">
            Get started
          </a>
          <a className="btn-ghost" href="/workout">
            Open a workout
          </a>
        </div>
      </section>

      {/* API status — visible during Phase 1 dev */}
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
        {error && (
          <p className="mt-2 font-mono text-xs text-danger">
            {error} (start the API with `docker compose up` from the project root)
          </p>
        )}
      </section>

      {/* Trees preview — placeholder until T35 builds NodeTree */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Your progression paths</h2>
        {progressions.length === 0 ? (
          <p className="text-surface-fg-muted">
            Three trees seeded by the backend: Vertical Push, Horizontal Pull,
            Core. Once you complete onboarding, your current node lights up
            here.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-3">
            {progressions.map((p) => {
              const Icon = TREE_ICONS[p.tree.slug] ?? Flame;
              return (
                <li key={p.tree.id} className="card space-y-2">
                  <Icon className="h-6 w-6 text-primary" aria-hidden />
                  <h3 className="font-semibold">{p.tree.name}</h3>
                  <p className="text-sm text-surface-fg-muted">
                    {p.tree.description}
                  </p>
                  <p className="text-xs text-surface-fg-subtle">
                    {p.unlocked_node_count} unlocked · {p.locked_node_count} locked
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
