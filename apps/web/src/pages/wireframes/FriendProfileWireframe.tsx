/**
 * Wireframe — Friend Profile.
 *
 * Production route: `/u/:handle`. Authed. Priority P2.
 * Single render (loading + success share the page; skeleton is the brief
 * loading state).
 */
import { useSearchParams } from 'react-router-dom';
import { Mountain } from 'lucide-react';
import {
  Section,
  Skeleton,
  PlaceholderAvatar,
  StatChip,
} from './_primitives';

const STATS = [
  { label: 'Workouts', value: '127' },
  { label: 'Streak', value: '24 days' },
  { label: 'Nodes', value: '8 unlocked' },
  { label: 'Following', value: '14' },
];

export default function FriendProfileWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as 'loading' | 'success';

  if (state === 'loading') {
    return (
      <div className="space-y-8">
        <div className="card flex items-center gap-4">
          <Skeleton variant="circle" className="!h-16 !w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="line" className="w-1/3" />
            <Skeleton variant="line" className="w-1/2" />
          </div>
        </div>
        <Skeleton variant="block" className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section>
        <div className="card flex flex-wrap items-center gap-4">
          <PlaceholderAvatar size={64} />
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-semibold">@maria_pulls</h1>
            <p className="text-sm text-surface-fg-muted">
              Working on front lever. Pulls 3×/week. Toronto.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" type="button">
              Message
            </button>
            <button className="btn-primary" type="button">
              Follow
            </button>
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATS.map((s) => (
            <StatChip key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </Section>

      <Section title="Public tree">
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
              <Mountain aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pull → Front Lever</p>
              <p className="text-xs text-surface-fg-muted">
                Current node: archer row 3×8
              </p>
            </div>
          </div>
          <p className="text-xs text-surface-fg-subtle">
            Read-only preview. Tap a node to cheer.
          </p>
          {/* Inline placeholder DAG, compact */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`h-10 rounded-md ${
                  i === 4
                    ? 'bg-primary/30 ring-1 ring-primary'
                    : i < 5
                      ? 'bg-surface-muted'
                      : 'bg-surface-subtle text-surface-fg-subtle'
                }`}
              />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}