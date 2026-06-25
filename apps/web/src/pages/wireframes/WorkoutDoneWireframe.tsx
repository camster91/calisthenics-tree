/**
 * Wireframe — Workout Complete (post-set summary).
 *
 * Production route: `/workout/:node_id/done`. Authed. Priority P0.
 * Confirms what was logged, shows next-step suggestion, offers share.
 */
import { ArrowRight, Share2, Mountain } from 'lucide-react';
import { PageHeader, Section, StatChip } from './_primitives';

export default function WorkoutDoneWireframe() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow="Workout · done"
        title="Logged. Nice work."
        description="Pike push-up · 3 sets · 23 reps · 12 min"
        actions={
          <button className="btn-ghost" type="button">
            <Share2 aria-hidden className="h-4 w-4" /> Share
          </button>
        }
      />

      <Section title="What you did">
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Sets" value="3" tone="success" />
            <StatChip label="Reps" value="23" tone="success" />
            <StatChip label="Duration" value="12 min" />
            <StatChip label="Avg RIR" value="2" tone="success" />
          </div>
          <p className="text-sm text-surface-fg-muted">
            You hit RIR-2 on every set. Next session: try adding 1 rep to set 1.
          </p>
        </div>
      </Section>

      <Section title="Up next">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
            <Mountain aria-hidden className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">Wall handstand (3×30s)</p>
            <p className="text-xs text-surface-fg-muted">
              Unlocks when you hit RIR-2 on Pike push-up 3×8.
            </p>
          </div>
          <a className="btn-primary" href="/wireframes/workout-log">
            Start <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </Section>

      <Section title="Tendon load">
        <div className="card space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Wrists</span>
            <StatChip label="" value="ok" tone="success" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Elbows</span>
            <StatChip label="" value="ok" tone="success" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Shoulders</span>
            <StatChip label="" value="watch" tone="warning" />
          </div>
          <a className="btn-ghost w-fit" href="/wireframes/tendon-insight">
            See detail
          </a>
        </div>
      </Section>

      <div className="flex gap-2">
        <a className="btn-ghost flex-1" href="/wireframes/home">
          Back to tree
        </a>
        <a className="btn-primary flex-1" href="/wireframes/feed">
          See friends <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}