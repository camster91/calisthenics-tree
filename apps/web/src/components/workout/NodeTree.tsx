/**
 * NodeTree — SVG DAG renderer with dagre auto-layout.
 *
 * - Vertical or horizontal layout (default vertical).
 * - Locked nodes greyed out and not clickable.
 * - Current node glows.
 * - Hover (or focus) shows prerequisite chain via tooltip on each edge.
 *
 * Dependencies: dagre is the layout engine. ~12KB gzipped; worth it
 * for the auto-layout + crossing-minimization you can't get from
 * hand-placed coords.
 */
import { useMemo, useRef, useEffect, useState } from 'react';
import dagre from 'dagre';
import { Lock, Play, Unlock } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { WorkoutNode } from './types';

export interface NodeEdge {
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
}

export interface NodeTreeProps {
  nodes: WorkoutNode[];
  edges: NodeEdge[];
  /** Called when an unlocked node is clicked. */
  onSelect?: (node: WorkoutNode) => void;
  /** Layout direction. */
  orientation?: 'TB' | 'LR';
  className?: string;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: WorkoutNode;
}
interface LayoutEdge {
  from: string;
  to: string;
  points: { x: number; y: number }[];
}

const NODE_W = 180;
const NODE_H = 72;

function layoutGraph(
  nodes: WorkoutNode[],
  edges: NodeEdge[],
  orientation: 'TB' | 'LR',
): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: orientation,
    nodesep: 32,
    ranksep: 60,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge({ v: e.from, w: e.to });
  }
  dagre.layout(g);

  const laid: LayoutNode[] = [];
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    const meta = g.node(n.id);
    if (!meta) continue;
    const ln: LayoutNode = {
      id: n.id,
      x: meta.x,
      y: meta.y,
      width: NODE_W,
      height: NODE_H,
      data: n,
    };
    laid.push(ln);
    if (meta.x + NODE_W > maxX) maxX = meta.x + NODE_W;
    if (meta.y + NODE_H > maxY) maxY = meta.y + NODE_H;
  }
  const out: LayoutEdge[] = [];
  for (const e of edges) {
    const m = g.edge({ v: e.from, w: e.to });
    if (!m) continue;
    out.push({
      from: e.from,
      to: e.to,
      points: [
        { x: m.points[0].x, y: m.points[0].y },
        ...m.points.slice(1, -1).map((p) => ({ x: p.x, y: p.y })),
        { x: m.points[m.points.length - 1].x, y: m.points[m.points.length - 1].y },
      ],
    });
  }
  return {
    nodes: laid,
    edges: out,
    width: maxX + 24,
    height: maxY + 24,
  };
}

function pathFor(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(' ');
}

export function NodeTree({
  nodes,
  edges,
  onSelect,
  orientation = 'TB',
  className,
}: NodeTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const laid = useMemo(() => layoutGraph(nodes, edges, orientation), [nodes, edges, orientation]);

  // Build a quick edge lookup for prerequisite highlighting.
  const downstream = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      const arr = m.get(e.from) ?? [];
      arr.push(e.to);
      m.set(e.from, arr);
    }
    return m;
  }, [edges]);

  // Scroll-to-current on mount (UX nicety; the user opens the tree
  // and lands on the node they're meant to train).
  useEffect(() => {
    if (!containerRef.current) return;
    const cur = laid.nodes.find((n) => n.data.state === 'current');
    if (!cur) return;
    const c = containerRef.current;
    c.scrollTo({
      left: cur.x - c.clientWidth / 2 + cur.width / 2,
      top: cur.y - c.clientHeight / 2 + cur.height / 2,
      behavior: 'smooth',
    });
  }, [laid]);

  // Determine which edges light up when a node is hovered: we show
  // the full downstream path from that node.
  const highlightEdgeSet = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const out = new Set<string>();
    const stack = [hoveredId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      const ds = downstream.get(id) ?? [];
      for (const d of ds) {
        out.add(`${id}->${d}`);
        stack.push(d);
      }
    }
    return out;
  }, [hoveredId, downstream]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-[60vh] w-full overflow-auto rounded-lg border border-surface-border bg-surface',
        className,
      )}
      role="tree"
      aria-label="Progression tree"
    >
      <svg
        width={laid.width}
        height={laid.height}
        viewBox={`0 0 ${laid.width} ${laid.height}`}
        className="block"
        role="presentation"
      >
        {laid.edges.map((e) => {
          const key = `${e.from}->${e.to}`;
          const isHighlighted = highlightEdgeSet.has(key);
          return (
            <path
              key={key}
              d={pathFor(e.points)}
              fill="none"
              stroke={isHighlighted ? 'var(--color-primary)' : 'var(--color-dag-edge)'}
              strokeWidth={isHighlighted ? 3 : 2}
              className="transition-colors"
            />
          );
        })}

        {laid.nodes.map((n) => {
          const isLocked = n.data.state === 'locked';
          const isCurrent = n.data.state === 'current';
          const isUnlocked = n.data.state === 'unlocked';
          const isHighlighted = hoveredId === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x - n.width / 2}, ${n.y - n.height / 2})`}
              role="treeitem"
              tabIndex={isLocked ? -1 : 0}
              aria-disabled={isLocked || undefined}
              aria-label={`${n.data.name} (${n.data.state})`}
              className={cn(
                'cursor-pointer focus:outline-none',
                isLocked && 'cursor-not-allowed',
              )}
              onClick={() => {
                if (!isLocked) onSelect?.(n.data);
              }}
              onKeyDown={(e) => {
                if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect?.(n.data);
                }
              }}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId((id) => (id === n.id ? null : id))}
              onFocus={() => setHoveredId(n.id)}
              onBlur={() => setHoveredId((id) => (id === n.id ? null : id))}
            >
              <rect
                width={n.width}
                height={n.height}
                rx="16"
                fill={
                  isCurrent
                    ? 'var(--color-primary)'
                    : isUnlocked
                      ? 'var(--color-surface-subtle)'
                      : 'var(--color-surface-muted)'
                }
                stroke={
                  isCurrent
                    ? 'var(--color-primary)'
                    : isHighlighted
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-border)'
                }
                strokeWidth={isCurrent || isHighlighted ? 3 : 1.5}
                style={
                  isCurrent
                    ? { filter: 'drop-shadow(0 0 28px rgba(255, 107, 26, 0.55))' }
                    : undefined
                }
              />
              <foreignObject x="0" y="0" width={n.width} height={n.height}>
                <div
                  className={cn(
                    'flex h-full items-center gap-2 px-3 text-xs',
                    isCurrent ? 'text-primary-on' : 'text-surface-fg',
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  ) : isCurrent ? (
                    <Play className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <Unlock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{n.data.name}</span>
                    <span
                      className={cn(
                        'truncate text-[10px]',
                        isCurrent ? 'opacity-90' : 'opacity-70',
                      )}
                    >
                      {n.data.targetHoldSecs
                        ? `${n.data.targetSets}×${n.data.targetHoldSecs}s`
                        : `${n.data.targetSets}×${n.data.targetReps ?? '?'} reps`}
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}