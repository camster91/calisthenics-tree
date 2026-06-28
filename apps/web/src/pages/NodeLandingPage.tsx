/**
 * NodeLandingPage — /learn/:slug
 *
 * Public, SEO-friendly landing page for a single skill node.
 * Slug format: `{tree_slug}-r{rank}-{name-slug}`, derived from data.
 * e.g. /learn/pull_front_lever_path-r1-tuck-front-lever
 *
 * No auth required. Indexable by Google. Drives organic traffic
 * (PLAN.md Phase 3 — programmatic SEO).
 *
 * Each page shows:
 *   - Hero (exercise name + tree + rank + level)
 *   - "Where you are" calculator (compare user input to target)
 *   - CTA: "Track this in the app" → /onboarding/q1?ref=<node_uuid>
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
} from 'lucide-react';

import { ApiError, type DagTree, type DagNode } from '../lib/api';
import { Button } from '../components/ui/button';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

const TREE_DESCRIPTIONS: Record<string, string> = {
  push_handstand_pushup_path: 'Vertical Push — from wall push-ups to handstand push-ups.',
  pull_front_lever_path: 'Horizontal Pull — from dead hangs to front lever.',
  core_dragon_flag_path: 'Core — from planks to dragon flag.',
};

const TREE_NAME: Record<string, string> = {
  push_handstand_pushup_path: 'Vertical Push',
  pull_front_lever_path: 'Horizontal Pull',
  core_dragon_flag_path: 'Core',
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nodeSlug(treeSlug: string, rank: number, name: string): string {
  return `${treeSlug}-r${rank}-${slugify(name)}`;
}

interface CalculatorResult {
  state: 'pending' | 'ready' | 'regress' | 'almost';
  message: string;
  /** Optional regression node to suggest (looked up from edges). */
  regression?: { node_id: string; name: string };
}

export default function NodeLandingPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trees, setTrees] = useState<DagTree[]>([]);
  const [regressionIndex, setRegressionIndex] = useState<Map<string, string[]>>(
    new Map(),
  );

  // Fetch all trees once, build a slug→node map + regression index.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    // Fan out: one fetch per tree so we get the per-tree current_node_id.
    // (The /api/v1/trees list-all endpoint doesn't return current_node_id,
    // and a node landing page doesn't need a current node — just data.)
    // To keep this simple: fetch /api/v1/trees (the list endpoint).
    import('../lib/api').then(({ api }) => {
      api<{ trees: DagTree[] }>('/trees', { skipAuth: true })
        .then((r) => {
          if (cancelled) return;
          setTrees(r.trees);
          // Build regression index: from_node_id → [to_node_id, ...]
          const idx = new Map<string, string[]>();
          for (const tree of r.trees) {
            for (const e of tree.edges) {
              if (e.edge_type === 'regression') {
                const arr = idx.get(e.from_node_id) ?? [];
                arr.push(e.to_node_id);
                idx.set(e.from_node_id, arr);
              }
            }
          }
          setRegressionIndex(idx);
          setStatus('ready');
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 404) {
            setStatus('notfound');
            return;
          }
          setErrorMsg(
            err instanceof Error ? err.message : 'Failed to load trees',
          );
          setStatus('error');
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const { node, tree } = useMemo(() => {
    for (const t of trees) {
      for (const n of t.nodes) {
        if (nodeSlug(t.slug, n.rank_level, n.name) === slug) {
          return { node: n, tree: t };
        }
      }
    }
    return { node: undefined as DagNode | undefined, tree: undefined as DagTree | undefined };
  }, [slug, trees]);

  if (status === 'loading') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-4 py-8"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (status === 'notfound' || (status === 'ready' && !node)) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <h1 className="text-3xl font-semibold">Skill not found</h1>
        <p className="text-sm text-surface-fg-muted">
          We don't have a landing page for "{slug}". Browse the full tree:
        </p>
        <Button asChild variant="default">
          <Link to="/welcome">Back to overview</Link>
        </Button>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <AlertCircle aria-hidden className="h-8 w-8 text-danger" />
        <p className="text-sm text-surface-fg-muted">{errorMsg}</p>
      </main>
    );
  }

  if (!node || !tree) return null;

  const isIsometric = node.movement_type === 'isometric';
  const treeName = TREE_NAME[tree.slug] ?? tree.name;
  const treeDesc =
    TREE_DESCRIPTIONS[tree.slug] ??
    tree.description ??
    `${tree.name} progression path.`;
  const ctaHref = `/onboarding/q1?ref=${encodeURIComponent(node.node_id)}`;

  return (
    <main
      id="main"
      className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-12"
      data-testid="node-landing"
    >
      {/* Header / breadcrumb */}
      <header className="space-y-4">
        <p className="display-eyebrow">
          <Link to="/" className="hover:text-surface-fg">
            {treeName}
          </Link>
          {' · Rank '}
          {node.rank_level}
        </p>
        <h1 className="text-balance text-4xl font-bold leading-heading tracking-tighter sm:text-5xl">
          {node.name}
        </h1>
        <p className="max-w-2xl text-base leading-body text-surface-fg-muted">
          {treeDesc}
        </p>
      </header>

      {/* Hero stats */}
      <section
        aria-labelledby="target-heading"
        className="card grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
            Target
          </p>
          <p className="font-mono text-2xl">
            {node.target_sets}×
            <span className="text-primary">
              {isIsometric
                ? `${node.target_hold_secs ?? 0}s`
                : `${node.target_reps ?? '?'} reps`}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
            Movement
          </p>
          <p className="capitalize">{node.movement_type}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
            Position
          </p>
          <p>
            Rank {node.rank_level} of {tree.nodes.length}
          </p>
        </div>
      </section>

      {/* Where-you-are calculator */}
      <section
        aria-labelledby="calc-heading"
        className="card space-y-4"
      >
        <h2 id="calc-heading" className="text-xl font-semibold">
          Where are you?
        </h2>
        <p className="text-sm text-surface-fg-muted">
          {isIsometric
            ? `Time a max hold. ${node.target_hold_secs ?? 0}s is the target — within 2s counts as ready, anything less we’ll suggest a regression.`
            : `Count your max reps in a single set. ${node.target_reps ?? '?'} reps is the target — within 2 counts as ready, anything less we’ll suggest a regression.`}
        </p>
        <Calculator
          node={node}
          regressionIndex={regressionIndex}
          trees={trees}
        />
      </section>

      {/* CTA */}
      <section
        aria-labelledby="cta-heading"
        className="card space-y-3"
      >
        <h2 id="cta-heading" className="text-xl font-semibold">
          Track this in the app
        </h2>
        <p className="text-sm text-surface-fg-muted">
          Log your sets, watch the strain load, and unlock the next rung.
          Free during early access.
        </p>
        <Button asChild variant="default" size="lg" data-testid="node-landing-cta">
          <Link to={ctaHref}>
            Get started
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-surface-fg-subtle">
          Already have an account?{' '}
          <Link to={`/login?next=${encodeURIComponent(ctaHref)}`} className="underline">
            Sign in
          </Link>
          .
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border pt-6 text-xs text-surface-fg-subtle">
        <Link to="/welcome" className="hover:text-surface-fg">
          ← Calisthenics Tree home
        </Link>
      </footer>
    </main>
  );
}

// -----------------------------------------------------------------------------//
// Calculator sub-component
// -----------------------------------------------------------------------------//

function Calculator({
  node,
  regressionIndex,
  trees,
}: {
  node: DagNode;
  regressionIndex: Map<string, string[]>;
  trees: DagTree[];
}) {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const isIsometric = node.movement_type === 'isometric';
  const target = isIsometric ? node.target_hold_secs ?? 0 : node.target_reps ?? 0;

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(input.trim(), 10);
    if (!Number.isFinite(n) || n < 0) {
      setResult({ state: 'pending', message: 'Enter a number first.' });
      return;
    }

    // Within 2 of target → ready
    if (n >= target - 2) {
      setResult({
        state: 'ready',
        message: `You're ready for ${node.name}. Sign in and start training.`,
      });
      return;
    }

    // 80–95% of target → almost there, suggest a few more sessions
    if (n >= target * 0.8) {
      setResult({
        state: 'almost',
        message: `${target - n} ${isIsometric ? 'seconds' : 'reps'} short — you should be ready within 1–2 weeks of consistent training.`,
      });
      return;
    }

    // Otherwise suggest a regression
    const regressionIds = regressionIndex.get(node.node_id) ?? [];
    let regression: { node_id: string; name: string } | undefined;
    for (const id of regressionIds) {
      for (const t of trees) {
        const n2 = t.nodes.find((nn) => nn.node_id === id);
        if (n2) {
          regression = { node_id: n2.node_id, name: n2.name };
          break;
        }
      }
      if (regression) break;
    }

    setResult({
      state: 'regress',
      message: regression
        ? `Start with ${regression.name} first. Work up to ${node.name} when that's solid.`
        : `Build a stronger foundation before ${node.name}. Start with earlier ranks in the ${TREE_NAME_REF.current ?? 'tree'} tree.`,
      regression,
    });
  };

  return (
    <form onSubmit={handleCheck} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="calc-input" className="text-sm font-medium">
          {isIsometric ? 'Max hold (seconds)' : 'Max reps'}
        </label>
        <input
          id="calc-input"
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isIsometric ? 'e.g. 12' : 'e.g. 8'}
          className="h-12 w-28 rounded-md border border-surface-border bg-surface px-3 font-mono text-base focus:border-primary focus:outline-none"
          data-testid="calc-input"
        />
        <Button type="submit" variant="default">
          <Play aria-hidden className="h-4 w-4" />
          Check
        </Button>
      </div>

      {result && (
        <div
          role="status"
          aria-live="polite"
          className={
            'rounded-md border p-3 text-sm ' +
            (result.state === 'ready'
              ? 'border-success/30 bg-success/5 text-success'
              : result.state === 'almost'
                ? 'border-warning/30 bg-warning/5 text-warning'
                : 'border-surface-border bg-surface-muted text-surface-fg')
          }
          data-testid="calc-result"
        >
          <div className="flex items-start gap-2">
            {result.state === 'ready' && (
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{result.message}</p>
          </div>
          {result.regression && (
            <Link
              to={`/learn/${trees
                .map((t) =>
                  t.nodes.find((n) => n.node_id === result.regression!.node_id),
                )
                .find(Boolean)
                ? (() => {
                    for (const t of trees) {
                      const n2 = t.nodes.find(
                        (nn) => nn.node_id === result.regression!.node_id,
                      );
                      if (n2) {
                        return `/learn/${nodeSlug(t.slug, n2.rank_level, n2.name)}`;
                      }
                    }
                    return '#';
                  })()
                : '#'}`}
              className="mt-2 inline-flex items-center gap-1 text-xs underline"
            >
              Try {result.regression.name} first
              <ArrowRight aria-hidden className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </form>
  );
}

// Lazy ref to avoid re-declaring the same lookup table.
const TREE_NAME_REF: { current: string | null } = { current: null };