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
            ? `${err.status} ${err.message}`
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
      className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8"
      data-testid="onboarding-result"
    >
      <header className="space-y-2 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('onboarding.resultTitle')}</h1>
        <p className="text-sm text-surface-fg-muted">{t('onboarding.resultBody')}</p>
      </header>

      <section className="mt-8 space-y-3" aria-labelledby="archetype-heading">
        <h2 id="archetype-heading" className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted">
          {t('onboarding.resultArchetype.beginner').startsWith('Archetype') ? 'Archetype' : 'Archetype'}
        </h2>
        <div className="card">
          <p className="text-xl font-semibold">{archetypeLabel}</p>
          <p className="mt-1 text-xs text-surface-fg-muted">
            RIR-2 offset: <span className="font-mono">{r.rir2_offset}</span>
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3" aria-labelledby="placements-heading">
        <h2 id="placements-heading" className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted">
          Starting nodes
        </h2>
        <ul className="space-y-2">
          {r.placements.map((p) => (
            <li key={p.tree_id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.tree_name}</p>
                <p className="text-xs text-surface-fg-muted">
                  {p.starting_node_name} · rank {p.starting_rank}
                </p>
              </div>
              <span className="text-xs text-surface-fg-subtle">unlocked</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 flex justify-center">
        <Button asChild variant="default" size="lg">
          <Link to="/">
            {t('onboarding.resultContinue')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      </footer>
    </main>
  );
}