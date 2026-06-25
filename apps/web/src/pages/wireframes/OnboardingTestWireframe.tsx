/**
 * Wireframe — Onboarding RIR-2 Pushup Test.
 *
 * Production route: `/onboarding/test`. Public. Priority P0.
 * States: empty (start), loading (counting), success (got RIR).
 *
 * Multi-state — driven by ?state=
 */
import { useSearchParams } from 'react-router-dom';
import { Play, RotateCcw, ArrowRight, Check } from 'lucide-react';
import {
  PageHeader,
  Section,
  Skeleton,
  StatChip,
  Spinner,
} from './_primitives';

export default function OnboardingTestWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'empty') as
    | 'empty'
    | 'loading'
    | 'success';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <PageHeader
        eyebrow="Step 3 of 5"
        title="RIR-2 push-up test"
        description="Push-ups until 2 reps in reserve (you could do 2 more, no more)."
      />

      {state === 'empty' && (
        <Section title="Get set">
          <div className="card space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-surface-fg-muted">
              <li>Floor, hands shoulder-width.</li>
              <li>Go at a 3-1-3 tempo: 3s down, 1s pause, 3s up.</li>
              <li>
                Stop when you could only do 2 more. The test takes the rep
                count.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <a className="btn-primary" href="/wireframes/onboarding/test?state=loading">
                <Play aria-hidden className="h-4 w-4" /> Start timer
              </a>
              <a className="btn-ghost" href="/wireframes/onboarding/test?state=success">
                Skip — log manually
              </a>
            </div>
          </div>
        </Section>
      )}

      {state === 'loading' && (
        <Section title="Going…">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <Spinner label="Counting reps" />
              <span className="font-mono text-2xl tabular-nums text-primary">
                00:42
              </span>
            </div>
            <div className="space-y-2">
              <Skeleton variant="line" className="w-3/4" />
              <Skeleton variant="line" className="w-1/2" />
              <Skeleton variant="block" className="h-32" />
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost" type="button">
                <RotateCcw aria-hidden className="h-4 w-4" /> Reset
              </button>
              <a
                className="btn-primary"
                href="/wireframes/onboarding/test?state=success"
              >
                <Check aria-hidden className="h-4 w-4" /> I'm at RIR-2
              </a>
            </div>
          </div>
        </Section>
      )}

      {state === 'success' && (
        <Section title="Result captured">
          <div className="card space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatChip label="Reps" value="14" tone="success" />
              <StatChip label="RIR" value="2" tone="success" />
              <StatChip label="Tempo" value="3-1-3" />
            </div>
            <p className="text-sm text-surface-fg-muted">
              We use this to fine-tune placement. You can adjust later.
            </p>
            <a className="btn-primary w-fit" href="/onboarding/result">
              See placement <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </div>
        </Section>
      )}

      <div
        data-dev="true"
        className="flex items-center justify-between border-t border-dashed border-surface-border pt-4 text-xs text-surface-fg-subtle"
      >
        <span>
          <span className="font-semibold uppercase tracking-wide">State:</span>{' '}
          <a
            className={state === 'empty' ? 'text-primary' : 'underline'}
            href="/wireframes/onboarding/test"
          >
            empty
          </a>{' '}
          ·{' '}
          <a
            className={state === 'loading' ? 'text-primary' : 'underline'}
            href="/wireframes/onboarding/test?state=loading"
          >
            loading
          </a>{' '}
          ·{' '}
          <a
            className={state === 'success' ? 'text-primary' : 'underline'}
            href="/wireframes/onboarding/test?state=success"
          >
            success
          </a>
        </span>
        <span>Step 3 of 5</span>
      </div>
    </div>
  );
}