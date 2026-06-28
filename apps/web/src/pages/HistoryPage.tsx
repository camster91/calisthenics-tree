/**
 * HistoryPage — `/history` route.
 *
 * Shows recent logged workouts with a per-tree streak counter.
 *
 * Routing:
 *   - Local-mode users → local.getLocalHistory() (localStorage)
 *   - Server-mode users → GET /api/v1/users/me/history (Sprint 36)
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Streak + totals cards now use BigNumber as the focal stat
 * - Streak card uses the hero Card variant (squircle, glow) when the
 *   streak is alive; default Card when zero (so a fresh user doesn't
 *   see an "empty" celebration)
 * - Day-grouped rows are squircle Cards with the tree emoji in a
 *   squircle chip
 * - "Promoted" badge promoted to a primary-toned pill
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Flame, ChevronRight, TrendingUp } from 'lucide-react';

import * as local from '../lib/local-mode';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { BigNumber } from '../components/ui/big-number';

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
      return;
    }
    // Server-mode: hit the backend history endpoint.
    api<HistoryResponse>('/users/me/history')
      .then((r) => setData(r))
      .catch(() => setData({ recent: [], total_workouts: 0, streak_days: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-3">
          <p className="display-eyebrow">History</p>
          <h1 className="text-5xl font-bold leading-heading tracking-tighter sm:text-6xl">
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
      <header className="space-y-3">
        <p className="display-eyebrow">History</p>
        <h1 className="text-5xl font-bold leading-heading tracking-tighter sm:text-6xl">
          Recent workouts
        </h1>
        <p className="max-w-xl text-base leading-body text-surface-fg-muted">
          Every set you log lands here. Stay consistent — small daily
          reps beat heroic once-a-month sessions.
        </p>
      </header>

      {/* Streak + totals summary */}
      <section
        className="grid gap-4 sm:grid-cols-2"
        data-testid="history-summary"
      >
        {/* Streak card — hero variant when streak > 0 to celebrate */}
        <Card
          variant={streak > 0 ? 'hero' : 'default'}
          className="flex items-center gap-4"
          data-testid="history-streak-card"
        >
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"
          >
            <Flame aria-hidden className="h-6 w-6" />
          </span>
          <div className="space-y-0.5">
            <p className="display-eyebrow">Day streak</p>
            <p className="flex items-baseline gap-2">
              <BigNumber
                size="lg"
                tone={streak > 0 ? 'primary' : 'muted'}
                data-testid="history-streak"
              >
                {streak}
              </BigNumber>
              <span className="text-sm font-medium text-surface-fg-muted">
                {streak === 1 ? 'day' : 'days'}
              </span>
            </p>
          </div>
        </Card>

        <Card variant="default" className="flex items-center gap-4">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-surface-fg"
          >
            <TrendingUp aria-hidden className="h-6 w-6" />
          </span>
          <div className="space-y-0.5">
            <p className="display-eyebrow">Workouts logged</p>
            <p className="flex items-baseline gap-2">
              <BigNumber size="lg" tone="default" data-testid="history-total">
                {total}
              </BigNumber>
              <span className="text-sm font-medium text-surface-fg-muted">
                total
              </span>
            </p>
          </div>
        </Card>
      </section>

      {/* Recent list */}
      <section
        className="space-y-6"
        aria-labelledby="recent-heading"
        data-testid="history-list"
      >
        <h2
          id="recent-heading"
          className="text-3xl font-bold leading-heading tracking-tighter"
        >
          Recent
        </h2>

        {groups.length === 0 ? (
          <Card variant="default" className="space-y-4">
            <div className="flex items-start gap-3">
              <CalendarDays
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-surface-fg-subtle"
              />
              <div className="space-y-1">
                <p className="text-base font-semibold text-surface-fg">
                  No workouts logged yet.
                </p>
                <p className="text-sm leading-body text-surface-fg-muted">
                  Head home, tap a tree's <em>Start workout</em>, and log a
                  set. Your streak starts the moment you finish one.
                </p>
              </div>
            </div>
            <Button asChild variant="default" size="lg" className="w-full">
              <Link to="/">
                Back to home
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        ) : (
          groups.map(({ day, rows: dayRows }, groupIdx) => (
            <div key={day} className="space-y-3">
              <h3 className="display-eyebrow">{day}</h3>
              <ul className="space-y-2">
                {dayRows.map((row, rowIdx) => (
                  <li
                    key={row.id}
                    className="spring-in"
                    style={{
                      animationDelay: `${(groupIdx * 80 + rowIdx * 40)}ms`,
                    }}
                  >
                    <Card
                      variant="default"
                      className="flex items-center gap-4"
                      data-testid="history-row"
                    >
                      <span
                        aria-hidden
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-2xl"
                      >
                        {treeIcon(row.tree_id)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold tracking-tighter text-surface-fg">
                          {row.exercise_name}
                        </p>
                        <p className="text-xs text-surface-fg-muted">
                          {row.tree_name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-base font-bold tabular-nums text-surface-fg">
                          {row.sets_completed}
                          <span className="text-surface-fg-muted">
                            /{row.sets_target}
                          </span>
                          <span className="ml-1 text-xs font-normal text-surface-fg-muted">
                            sets
                          </span>
                        </p>
                        <p className="text-xs tabular-nums text-surface-fg-subtle">
                          {formatTime(row.logged_at)}
                        </p>
                        {row.is_promotion && (
                          <span
                            data-testid="history-row-promoted"
                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-success/15 px-2 py-0.5 text-xs font-semibold text-accent-success"
                          >
                            Promoted
                          </span>
                        )}
                      </div>
                    </Card>
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