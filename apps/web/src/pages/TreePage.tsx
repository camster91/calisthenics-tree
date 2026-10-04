/**
 * TreePage — /tree/:treeId
 *
 * Full DAG browser. Fetches the tree (nodes + edges + caller's current
 * node) and renders it as an interactive SVG with dagre auto-layout.
 *
 * Public route (no auth required) per PLAN.md Gap 3 — DAG browse is
 * reference data. Authed users see their current node highlighted.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, AlertCircle, Play } from 'lucide-react';

import {
  ApiError,
  getTree,
  type DagResponse,
  type DagTree,
} from '../lib/api';
import { NodeTree } from '../components/workout/NodeTree';
import type { WorkoutNode } from '../components/workout/types';
import { TreeSigil } from '../components/brand/TreeSigil';
import { MOVEMENT_COLOR, movementFor } from '../lib/movement';

type Status = 'loading' | 'ready' | 'error';

export default function TreePage() {
  const { treeId = '' } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tree, setTree] = useState<DagTree | null>(null);

  useEffect(() => {
    if (!treeId) return;
    let cancelled = false;
    setStatus('loading');
    setErrorMsg(null);

    getTree(treeId)
      .then((r: DagResponse) => {
        if (cancelled) return;
        setTree(r.tree);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `${err.status}${err.detail ? ` ${err.detail}` : ` ${err.message}`}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setErrorMsg(msg);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [treeId]);

  /**
   * Map backend DagNode → WorkoutNode (the shape NodeTree expects).
   * State derivation: a node is "current" iff it matches current_node_id;
   * "unlocked" if rank_level <= current's rank_level; "locked" otherwise.
   * Locked-aware is approximate for v1 — a real graph traversal would
   * follow edges to compute true reachability, but rank_level is a
   * good-enough approximation for the linear progressions we ship.
   */
  const { nodes, edges } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const currentRank = tree.nodes.find((n) => n.node_id === tree.current_node_id)
      ?.rank_level ?? -1;

    const wnodes: WorkoutNode[] = tree.nodes.map((n) => ({
      id: n.node_id,
      name: n.name,
      movementType: n.movement_type,
      targetSets: n.target_sets,
      targetReps: n.target_reps,
      targetHoldSecs: n.target_hold_secs,
      intensityFactor: 1.0,
      pathways: [],
      state:
        n.node_id === tree.current_node_id
          ? 'current'
          : n.rank_level <= currentRank
            ? 'unlocked'
            : 'locked',
    }));

    const wedges = tree.edges.map((e) => ({
      from: e.from_node_id,
      to: e.to_node_id,
    }));

    return { nodes: wnodes, edges: wedges };
  }, [tree]);

  const movement = movementFor(treeId, tree?.name);
  const accent = movement ? MOVEMENT_COLOR[movement] : 'var(--color-primary)';

  if (status === 'error') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <AlertCircle aria-hidden className="h-8 w-8 text-danger" />
        <h1 className="text-2xl font-semibold">Couldn’t load that tree</h1>
        <p className="text-sm text-surface-fg-muted">{errorMsg}</p>
        <Link to="/" className="btn-ghost">
          Back to home
        </Link>
      </main>
    );
  }

  if (status === 'loading' || !tree) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-4 py-8"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-surface-fg-muted">Loading tree…</p>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8"
      data-testid="tree-page"
    >
      <header className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-surface-fg-muted transition-colors hover:text-surface-fg"
        >
          <ArrowLeft aria-hidden className="h-3 w-3" />
          All trees
        </Link>

        <div className="flex items-start gap-4">
          {movement && (
            <TreeSigil
              movement={movement}
              size={52}
              className="mt-1"
            />
          )}
          <div className="min-w-0 space-y-2">
            <p className="display-eyebrow">Progression tree</p>
            <h1 className="display-section text-balance text-4xl sm:text-5xl">
              {tree.name}
            </h1>
            {/* Thin movement-colour rule: one colour for this whole section. */}
            <span
              aria-hidden
              className="block h-0.5 w-16 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <p className="max-w-xl text-base leading-body text-surface-fg-muted">
              {tree.description}
            </p>
          </div>
        </div>

        {tree.current_node_id && (
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
            }}
            data-testid="tree-current-pill"
          >
            <Play aria-hidden className="h-4 w-4" style={{ color: accent }} />
            <span className="text-surface-fg-muted">Current:</span>
            <span className="font-bold text-surface-fg">
              {tree.nodes.find((n) => n.node_id === tree.current_node_id)?.name}
            </span>
          </div>
        )}
      </header>

      <NodeTree
        nodes={nodes}
        edges={edges}
        onSelect={(n) => {
          if (n.state !== 'locked') {
            navigate(`/workout/${encodeURIComponent(n.id)}`);
          }
        }}
      />

      <footer className="flex items-center justify-between gap-3 text-xs text-surface-fg-muted">
        <span>
          {tree.nodes.length} nodes · {tree.edges.length} edges
          {tree.current_node_id
            ? ` · ${
                tree.nodes.filter((n) => n.rank_level <=
                  (tree.nodes.find((nn) => nn.node_id === tree.current_node_id)?.rank_level ?? 0)
                ).length
              } unlocked`
            : ''}
        </span>
        <Link to="/" className="inline-flex items-center gap-1 hover:text-surface-fg">
          Back to home <ChevronRight aria-hidden className="h-3 w-3" />
        </Link>
      </footer>
    </main>
  );
}