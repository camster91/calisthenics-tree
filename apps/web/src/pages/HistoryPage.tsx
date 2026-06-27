/**
 * HistoryPage — `/history` route.
 *
 * Shows recent logged workouts with a per-tree streak counter. Backed by
 * local-mode (localStorage) today; once the backend exposes
 * GET /api/v1/users/me/history, the api.ts interceptor will route there
 * for server-mode users and fall back to local-mode for local users.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Flame, ChevronRight, TrendingUp } from 'lucide-react';

import * as local from '../lib/local-mode';
import { Button } from '../components/ui/button';

interface HistoryRow {
  id: string;
  logged_at: string;
  exercise_name: string;
  tree_id: string;
  tree_name: string;
  node_id: string;
  sets_completed: number;
  sets_target: number;
  is_promotion: boolean;
}

interface HistoryResponse {
  recent: HistoryRow[];
  total_workouts: number;
  streak_days: number;
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const yesterday = new Date(now.getTime() - dayMs);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function treeIcon(slug: string | undefined | null): string {
  const s = (slug ?? '').toLowerCase();
  if (s.includes('push')) return '🏔️';
  if (s.includes('pull')) return '🔥';
  if (s.includes('core')) return '⚓';
  return '⭐';
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (local.isLocalMode()) {
      setData(local.getLocalHistory());
      setLoading(false);
    } else {
      // Server-mode users: hook the backend history endpoint when it
      // exists. For now show an empty state.
      setData({ recent: [], total_workouts: 0, streak_days: 0 });
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="chip">History</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Recent workouts
          </h1>
        </header>
        <p className="text-sm text-surface-fg-muted">Loading…</p>
      </div>
    );
  }

  const total = data?.total_workouts ?? 0;
  const streak = data?.streak_days ?? 0;
  const rows = data?.recent ?? [];

  // Group rows by date label so the list reads top-to-bottom in time order.
  const groups: { day: string; rows: HistoryRow[] }[] = [];
  for (const row of rows) {
    const day = formatDay(row.logged_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.rows.push(row);
    } else {
      groups.push({ day, rows: [row] });
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="chip">History</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Recent workouts
        </h1>
        <p className="max-w-xl text-base text-surface-fg-muted">
          Every set you log lands here. Stay consistent — small daily
          reps beat heroic once-a-month sessions.
        </p>
      </header>

      {/* Streak + totals summary */}
      <section className="grid gap-3 sm:grid-cols-2" data-testid="history-summary">
        <div className="card flex items-center gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Flame aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
              Day streak
            </p>
            <p className="text-2xl font-semibold">
              {streak}
              <span className="ml-1 text-sm font-normal text-surface-fg-muted">
                day{streak === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <TrendingUp aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-surface-fg-muted">
              Workouts logged
            </p>
            <p className="text-2xl font-semibold">
              {total}
              <span className="ml-1 text-sm font-normal text-surface-fg-muted">
                total
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Recent list */}
      <section
        className="space-y-6"
        aria-labelledby="recent-heading"
        data-testid="history-list"
      >
        <h2 id="recent-heading" className="text-2xl font-semibold">
          This week
        </h2>

        {groups.length === 0 ? (
          <div className="card space-y-3 text-sm text-surface-fg-muted">
            <div className="flex items-start gap-3">
              <CalendarDays aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-surface-fg-subtle" />
              <div className="space-y-1">
                <p className="text-surface-fg">No workouts logged yet.</p>
                <p>
                  Head home, tap a tree's <em>Start workout</em>, and log a
                  set. Your streak starts the moment you finish one.
                </p>
              </div>
            </div>
            <Button asChild variant="default" size="lg">
              <Link to="/">
                Back to home
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          groups.map(({ day, rows: dayRows }) => (
            <div key={day} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-fg-muted">
                {day}
              </h3>
              <ul className="space-y-2">
                {dayRows.map((row) => (
                  <li
                    key={row.id}
                    className="card flex items-center gap-4"
                    data-testid="history-row"
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xl"
                    >
                      {treeIcon(row.tree_id)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">
                        {row.exercise_name}
                      </p>
                      <p className="text-xs text-surface-fg-muted">
                        {row.tree_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {row.sets_completed}/{row.sets_target}
                        <span className="ml-1 text-xs text-surface-fg-muted">
                          sets
                        </span>
                      </p>
                      <p className="text-xs text-surface-fg-subtle">
                        {formatTime(row.logged_at)}
                      </p>
                      {row.is_promotion && (
                        <p className="mt-1 text-xs font-semibold text-success">
                          Promoted
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}