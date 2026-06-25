/**
 * Wireframe — Onboarding Q2 (max reps) — branched from Q1=yes.
 *
 * Production route: `/onboarding/q2`. Public. Priority P0.
 */
import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { PageHeader, Section, StatChip } from './_primitives';

const RANGES = [
  { key: '1-2', label: '1–2 reps', placement: 'Pull-up negatives (5×5)' },
  { key: '3-5', label: '3–5 reps', placement: 'Pull-ups (3×3)' },
  { key: '6-10', label: '6–10 reps', placement: 'Pull-ups (4×5) + L-sit pull' },
  { key: '11+', label: '11+ reps', placement: 'Archer pull-ups (3×3)' },
];

export default function OnboardingQ2Wireframe() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow="Step 2 of 5"
        title="How many strict pull-ups, fresh?"
        description="Single set, no kip. Pick the closest range."
      />

      <Section>
        <div className="grid gap-3 sm:grid-cols-2">
          {RANGES.map((r) => {
            const active = picked === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setPicked(r.key)}
                className={`card text-left transition-colors ${
                  active
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <p className="text-lg font-semibold">{r.label}</p>
                <p className="mt-1 text-xs text-surface-fg-muted">
                  → starts you at {r.placement}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {picked && (
        <Section title="What we heard">
          <div className="flex flex-wrap gap-2">
            <StatChip label="Pull-ups" value={picked} tone="success" />
            <StatChip
              label="Starting node"
              value={RANGES.find((r) => r.key === picked)?.placement ?? ''}
            />
          </div>
        </Section>
      )}

      <div className="flex items-center justify-between border-t border-surface-border pt-4">
        <a className="btn-ghost" href="/onboarding/q1">
          <ArrowLeft aria-hidden className="h-4 w-4" /> Back
        </a>
        <a
          className={`btn-primary ${picked ? '' : 'pointer-events-none opacity-50'}`}
          href="/onboarding/test"
        >
          Continue <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}