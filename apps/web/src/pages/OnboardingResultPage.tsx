/**
 * /onboarding/result — placement result.
 *
 * On mount (or when answers change), POSTs to /api/v1/onboarding/place
 * with the accumulated answers. Shows the placement per tree + an
 * archetype label, then "Start training" CTA → /.
 *
 * If the user lands here without completed answers (direct URL), redirect
 * to /onboarding/q1.
 *
 * If they already have a stored result (revisit), show it without
 * re-submitting. They can re-submit by hitting "Recalculate" (TODO post-v1).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { useAuth } from '../lib/auth';
import { useOnboarding } from '../lib/onboarding';
import { api, ApiError } from '../lib/api';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import type { OnboardingPlaceResponse } from '../lib/api-types';

type FetchState =
  | { status: 'submitting' }
  | { status: 'success'; result: OnboardingPlaceResponse }
  | { status: 'error'; message: string };

export default function OnboardingResultPage() {
  const t = useT();
  const navigate = useNavigate();
  const { answers, result, setResult, isComplete } = useOnboarding();
  const { status: authStatus } = useAuth();

  const [fetchState, setFetchState] = useState<FetchState>(() =>
    result ? { status: 'success', result } : { status: 'submitting' },
  );

  // Guard: must be authed AND have completed answers to be here.
  // Match RequireAuth's loading-spinner pattern so a brief 'loading' phase
  // during AuthProvider hydration doesn't bounce us to /login. Without this
  // fix, a fast user who lands on /onboarding/result right after verify
  // (or after a hard refresh on the result page) sees the auth status flash
  // from 'loading' to 'authenticated' and the previous logic redirected to
  // /login on the 'loading' tick.
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!isComplete) {
      navigate('/onboarding/q1', { replace: true });
      return;
    }
    if (authStatus === 'anonymous') {
      navigate('/login', { replace: true });
      return;
    }
  }, [isComplete, authStatus, navigate]);

  // POST placement when we land here without a cached result.
  useEffect(() => {
    if (!isComplete || authStatus !== 'authenticated') return;
    if (result && fetchState.status === 'success' && fetchState.result === result) return;
    if (fetchState.status !== 'submitting') return;

    // safety: q1 must be non-null, the q2 field must be set by branch
    if (answers.can_pull_up === null) return;

    const request = {
      answers: {
        can_pull_up: answers.can_pull_up,
        support_hold_15s: answers.support_hold_15s ?? false,
        active_hang_10s: answers.active_hang_10s ?? false,
        rir2_pushup_reps: answers.rir2_pushup_reps ?? 0,
      },
    };

    api<OnboardingPlaceResponse>('/onboarding/place', {
      method: 'POST',
      body: request,
    })
      .then((r) => {
        setResult(r);
        setFetchState({ status: 'success', result: r });
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? `${err.status}${err.detail ? ` ${err.detail}` : ` ${err.message}`}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setFetchState({ status: 'error', message });
      });
  }, [
    isComplete,
    authStatus,
    answers,
    result,
    fetchState,
    setResult,
  ]);

  if (fetchState.status === 'submitting') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
        data-testid="onboarding-result-loading"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-surface-fg-muted">{t('common.loading')}</p>
      </main>
    );
  }

  if (fetchState.status === 'error') {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8"
      >
        <AlertCircle aria-hidden className="h-8 w-8 text-danger" />
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">{t('common.error')}</h1>
          <p className="text-sm text-surface-fg-muted">{fetchState.message}</p>
        </div>
        <Button asChild variant="default" size="lg">
          <Link to="/onboarding/test">{t('auth.tryAgain')}</Link>
        </Button>
      </main>
    );
  }

  const r = fetchState.result;
  // i18next returns a Record<string, string> for nested keys (en.json's
  // resultArchetype is an object map). Cast through unknown because the
  // generic t() overload doesn't know about nested shapes.
  const archetypeLabels = t('onboarding.resultArchetype') as unknown as Record<string, string>;
  const archetypeLabel = archetypeLabels[r.archetype] ?? r.archetype;

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-8"
      data-testid="onboarding-result"
    >
      {/* Hero — celebration moment, Fitness+ style */}
      <header className="flex flex-col items-center gap-4 text-center">
        <div
          aria-hidden
          className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent-success/15 text-accent-success spring-in"
        >
          <CheckCircle2 aria-hidden className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <p className="display-eyebrow text-accent-success">Ready</p>
          <h1 className="text-balance text-4xl font-bold leading-heading tracking-tighter sm:text-5xl">
            {t('onboarding.resultTitle')}
          </h1>
          <p className="max-w-md text-base leading-body text-surface-fg-muted">
            {t('onboarding.resultBody')}
          </p>
        </div>
      </header>

      {/* Archetype — BigNumber focal stat for the rank */}
      <Card
        variant="hero"
        className="flex flex-col items-center gap-1 py-7"
        data-testid="onboarding-archetype"
      >
        <p className="display-eyebrow">Archetype</p>
        <p className="text-3xl font-bold leading-heading tracking-tighter text-primary">
          {archetypeLabel}
        </p>
        <p className="text-sm text-surface-fg-muted">
          RIR-2 offset: <span className="font-mono text-surface-fg">{r.rir2_offset}</span>
        </p>
      </Card>

      <section className="space-y-3" aria-labelledby="placements-heading">
        <h2 id="placements-heading" className="display-eyebrow">
          Starting nodes
        </h2>
        <ul className="space-y-2">
          {r.placements.map((p, idx) => (
            <li
              key={p.tree_id}
              className="spring-in"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <Card variant="default" className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold tracking-tighter text-surface-fg">
                    {p.tree_name}
                  </p>
                  <p className="text-sm text-surface-fg-muted">
                    {p.starting_node_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-surface-fg-muted">
                    Rank
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {p.starting_rank}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex justify-center pt-2">
        <Button asChild variant="default" size="lg" className="min-w-[200px]">
          <Link to="/">
            {t('onboarding.resultContinue')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      </footer>
    </main>
  );
}