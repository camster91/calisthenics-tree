/**
 * Wireframe — Onboarding placement result.
 *
 * Production route: `/onboarding/result`. Public. Priority P0.
 * Shows the user where they landed in each of the three trees.
 */
import { ArrowRight, Mountain, Flame, Anchor } from 'lucide-react';
import { PageHeader, Section, StatChip } from './_primitives';

const PLACEMENTS = [
  {
    Icon: Mountain,
    path: 'Push',
    slug: 'push_handstand_pushup_path',
    node: 'Pike push-up (3×8)',
    note: 'Shoulder pathway · unlocked',
  },
  {
    Icon: Flame,
    path: 'Pull',
    slug: 'pull_front_lever_path',
    node: 'Inverted row (3×8)',
    note: 'Bent-arm elbow · unlocked',
  },
  {
    Icon: Anchor,
    path: 'Core',
    slug: 'core_dragon_flag_path',
    node: 'Hollow hold 20s',
    note: 'Lumbar core · unlocked',
  },
];

export default function OnboardingResultWireframe() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow="Step 5 of 5 · placed"
        title="You're on the tree."
        description="Three starting nodes. The tree adjusts as you log workouts."
        actions={
          <a className="btn-primary" href="/">
            Open my tree <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        }
      />

      <Section title="Where you landed">
        <div className="grid gap-4 sm:grid-cols-3">
          {PLACEMENTS.map(({ Icon, path, node, note }) => (
            <article key={path} className="card space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/40">
                <Icon aria-hidden className="h-5 w-5" />
              </div>
              <p className="chip">{path}</p>
              <h3 className="text-base font-semibold leading-snug">{node}</h3>
              <p className="text-xs text-surface-fg-subtle">{note}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="What unlocks first">
        <div className="card flex flex-wrap items-center gap-3">
          <StatChip label="Next push" value="Wall handstand (3×30s)" />
          <StatChip label="Next pull" value="Negative pull-ups (5×3)" />
          <StatChip label="Next core" value="Tuck L-sit (3×10s)" tone="warning" />
          <p className="text-xs text-surface-fg-subtle">
            Reach RIR-2 on each before they unlock. ~2 weeks at 3×/week.
          </p>
        </div>
      </Section>
    </div>
  );
}