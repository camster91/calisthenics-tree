/**
 * Wireframe — Onboarding Q1 (pull-up?).
 *
 * Production route: `/onboarding/q1`. Public. Priority P0.
 * Branches: yes → q2 (rep count). no → q3 (negative / row variant).
 */
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { PageHeader, Section } from './_primitives';

const OPTIONS = [
  {
    key: 'yes',
    label: 'Yes — strict, chin over bar',
    body: 'I can do at least one clean pull-up.',
    next: '/onboarding/q2',
  },
  {
    key: 'band',
    label: 'Only with a band',
    body: 'Pull-ups with assistance count.',
    next: '/onboarding/q3',
  },
  {
    key: 'no',
    label: 'No — not yet',
    body: 'I can hang, or I am working up to it.',
    next: '/onboarding/q3',
  },
];

export default function OnboardingQ1Wireframe() {
  // Pre-select first option so the wireframe shows a populated selection
  // state for review. Real flow starts empty.
  const [picked, setPicked] = useState<string | null>(OPTIONS[0].key);
  const next = OPTIONS.find((o) => o.key === picked)?.next ?? '#';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow={`Step 1 of 5`}
        title="Can you do a strict pull-up?"
        description="Be honest — this just places you. The tree adjusts."
      />

      <Section>
        <div className="space-y-3">
          {OPTIONS.map((o) => {
            const active = picked === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setPicked(o.key)}
                className={`card flex w-full items-start gap-4 text-left transition-colors ${
                  active
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-surface-muted'
                }`}
                aria-pressed={active}
              >
                <div
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    active
                      ? 'border-primary bg-primary text-primary-on'
                      : 'border-surface-border text-transparent'
                  }`}
                >
                  <Check aria-hidden className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-base font-semibold">{o.label}</p>
                  <p className="text-sm text-surface-fg-muted">{o.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-surface-border pt-4">
        <span className="text-xs text-surface-fg-subtle">
          Step 1 of 5 · ~90 seconds total
        </span>
        <a
          aria-disabled={!picked}
          className={`btn-primary ${picked ? '' : 'pointer-events-none opacity-40 grayscale'}`}
          href={next}
        >
          Continue <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}