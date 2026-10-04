/**
 * InsightsPage — /insights/tendon
 *
 * 4-week rolling strain per joint pathway, with deload alerts when the
 * latest week's load exceeds 1.5x the historical average. Matches the
 * spec from PLAN.md "Tendon strain score with rolling-4-week deload alerts".
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, TrendingDown } from 'lucide-react';

import { ApiError, getTendonStrain } from '../lib/api';
import { TendonStrainCard } from '../components/workout/TendonStrainCard';
import { EmptyState } from '../components/ui/empty-state';
import type { TendonPathwayStatus } from '../components/workout/types';

type Status = 'loading' | 'ready' | 'error';

export default function InsightsPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<TendonPathwayStatus[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMsg(null);

    getTendonStrain()
      .then((r) => {
        if (cancelled) return;
        setStatuses(
          r.statuses.map((s) => ({
            pathway: s.pathway,
            status: s.status,
            sparkline: s.sparkline,
          })),
        );
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `${err.status}${err.detail ? ` ${err.detail}` : ` ${err.message}`}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setErrorMsg(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deloadCount = statuses.filter((s) => s.status === 'deload').length;
  const watchCount = statuses.filter((s) => s.status === 'watch').length;

  return (
    <main
      id="main"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8"
      data-testid="insights-page"
    >
      <header className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-surface-fg-muted transition-colors hover:text-surface-fg"
        >
          <ArrowLeft aria-hidden className="h-3 w-3" />
          Back to home
        </Link>
        <p className="display-eyebrow">Tendon strain</p>
        <h1 className="display-section text-4xl sm:text-5xl">
          Insights
        </h1>
        <p className="max-w-xl text-base leading-body text-surface-fg-muted">
          Strain loads on the joints that take the brunt of your training.
          Dips in the 4-week trend are normal; spikes above 1.5× the
          baseline mean it's time to deload.
        </p>
      </header>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-surface-fg-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Loading your strain history…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {status === 'ready' && (
        <>
          {deloadCount > 0 && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
              data-testid="insights-deload-banner"
            >
              <TrendingDown aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  {deloadCount === 1
                    ? 'One pathway is above 1.5× baseline'
                    : `${deloadCount} pathways are above 1.5× baseline`}
                </p>
                <p className="text-xs opacity-80">
                  Take an easier session or pick a regression node for the
                  affected area.
                </p>
              </div>
            </div>
          )}

          {watchCount > 0 && deloadCount === 0 && (
            <p className="text-sm text-warning">
              {watchCount} pathway trending up — not deload-worthy yet, but
              watch the next session.
            </p>
          )}

          {statuses.length === 0 ? (
            <EmptyState
              message="No strain data yet. Log a few workouts to see each joint's load trend here."
              hint="Every set adds load to the joints it works (intensity × reps or seconds × rank)."
              action={{ label: 'Start a workout', to: '/' }}
            />
          ) : (
            <TendonStrainCard statuses={statuses} />
          )}
        </>
      )}
    </main>
  );
}