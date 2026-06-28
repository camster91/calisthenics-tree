/**
 * FeedPage — /feed
 *
 * Path B (community/social DAG) entry point. Lists the user's own recent
 * unlock events (promotions + regressions) — the foundation the friends
 * graph will build on in P4+.
 *
 * For now: self-only feed. When the friends endpoint ships, this page
 * gains a "Friends" tab + the social viewing surface.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

import { ApiError, getFeed, type FeedItem } from '../lib/api';
import { useAuth } from '../lib/auth';

type Status = 'loading' | 'ready' | 'error';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const { user: me } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMsg(null);

    getFeed(20)
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `${err.status} ${err.message}`
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

  const promotions = items.filter((i) => i.trigger === 'PROMOTION').length;
  const regressions = items.filter((i) => i.trigger === 'CRITICAL_FAIL').length;

  return (
    <main
      id="main"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8"
      data-testid="feed-page"
    >
      <header className="space-y-3">
        <p className="display-eyebrow">Activity</p>
        <h1 className="text-4xl font-bold leading-heading tracking-tighter sm:text-5xl">
          Your activity
        </h1>
        <p className="max-w-xl text-base leading-body text-surface-fg-muted">
          Every promotion and regression from your recent workouts. Friends
          view coming in Phase 4 — for now this is your private timeline.
        </p>
      </header>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-surface-fg-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Loading your activity…
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

      {status === 'ready' && items.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-surface-fg-muted">
          <span className="inline-flex items-center gap-1">
            <TrendingUp aria-hidden className="h-3 w-3 text-success" />
            {promotions} promotion{promotions === 1 ? '' : 's'}
          </span>
          {regressions > 0 && (
            <span className="inline-flex items-center gap-1">
              <TrendingDown aria-hidden className="h-3 w-3 text-warning" />
              {regressions} regression{regressions === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="card space-y-3 text-sm text-surface-fg-muted">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden className="h-4 w-4 text-primary" />
            <p>Nothing yet — your activity will show up here as you train.</p>
          </div>
          <p className="text-xs">
            Tip: log a workout at a node where you're close to the target
            reps or hold time. The DAG engine decides whether you unlock
            the next rung or hold steady.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            Pick a workout
            <ArrowRight aria-hidden className="h-3 w-3" />
          </Link>
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <ol className="space-y-3" data-testid="feed-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="card flex items-start gap-3"
              data-testid={`feed-item-${item.id}`}
            >
              {item.trigger === 'PROMOTION' ? (
                <TrendingUp
                  aria-hidden
                  className="mt-0.5 h-5 w-5 shrink-0 text-success"
                />
              ) : (
                <TrendingDown
                  aria-hidden
                  className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">
                  {item.trigger === 'PROMOTION' ? (
                    <>
                      {item.user.id === me?.id ? 'You' : (
                        <Link
                          to={`/u/${encodeURIComponent(item.user.id)}`}
                          className="font-semibold underline"
                        >
                          {item.user.display_name ??
                            item.user.email.split('@')[0]}
                        </Link>
                      )}{' '}
                      unlocked{' '}
                      <span className="font-semibold">{item.new_node_name}</span>
                      {' '}on{' '}
                      <span className="text-surface-fg-muted">
                        {item.tree_name}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      {item.user.id === me?.id ? 'You' : (
                        <Link
                          to={`/u/${encodeURIComponent(item.user.id)}`}
                          className="font-semibold underline"
                        >
                          {item.user.display_name ??
                            item.user.email.split('@')[0]}
                        </Link>
                      )}{' '}
                      regressed to{' '}
                      <span className="font-semibold">{item.new_node_name}</span>
                      {' '}on{' '}
                      <span className="text-surface-fg-muted">
                        {item.tree_name}
                      </span>
                      .
                    </>
                  )}
                </p>
                {item.note && (
                  <p className="text-xs text-surface-fg-muted">{item.note}</p>
                )}
                <p className="text-xs text-surface-fg-subtle">
                  {timeAgo(item.occurred_at)} ·{' '}
                  <Link
                    to={`/workout/${encodeURIComponent(item.new_node_id)}`}
                    className="underline hover:text-surface-fg"
                  >
                    Train again
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}