/**
 * Wireframe — Onboarding Q3 (inverted row / starting variant) — branched from Q1=no.
 *
 * Production route: `/onboarding/q3`. Public. Priority P0.
 */
import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { PageHeader, Section } from './_primitives';

const VARIANTS = [
  {
    key: 'invert-30',
    label: '30s inverted hang',
    body: 'Shoulders engaged, body vertical, no swinging.',
  },
  {
    key: 'row-5',
    label: '5 inverted rows',
    body: 'Bar at chest height, feet on floor.',
  },
  {
    key: 'jackknife',
    label: 'Jackknife pull-ups',
    body: 'Knees to chest, partial ROM.',
  },
];

export default function OnboardingQ3Wireframe() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow="Step 2 of 5 · alternate path"
        title="What's your closest pull?"
        description="We'll start you on the right rung and unlock the rest."
      />

      <Section>
        <div className="space-y-3">
          {VARIANTS.map((v) => {
            const active = picked === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setPicked(v.key)}
                className={`card flex w-full items-start gap-4 text-left transition-colors ${
                  active
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-base font-semibold">{v.label}</p>
                  <p className="text-sm text-surface-fg-muted">{v.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

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