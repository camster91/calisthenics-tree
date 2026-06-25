/**
 * Wireframe — Tendon Strain Detail.
 *
 * Production route: `/insights/tendon`. Authed. Priority P1.
 * Shows recent strain per joint pathway with a 14-day sparkline-style
 * indicator. Pro-only (insight screen).
 */
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader, Section, Skeleton, StatChip } from './_primitives';

interface Joint {
  name: string;
  pathway: string;
  trend: 'up' | 'down' | 'flat';
  level: 'ok' | 'watch' | 'deload';
  history: number[]; // 14d strain 0-100
  advice: string;
}

const JOINTS: Joint[] = [
  {
    name: 'Wrists',
    pathway: 'wrist',
    trend: 'flat',
    level: 'ok',
    history: [22, 24, 26, 25, 28, 30, 28, 31, 33, 32, 34, 33, 35, 36],
    advice: 'No action needed. Keep warming up 2 min before hand-balancing.',
  },
  {
    name: 'Elbows',
    pathway: 'bent_arm_elbow',
    trend: 'up',
    level: 'watch',
    history: [40, 42, 45, 48, 50, 52, 55, 54, 58, 60, 62, 65, 68, 72],
    advice: 'Volume climbing fast. Drop pulling volume 25% this week.',
  },
  {
    name: 'Shoulders',
    pathway: 'straight_arm_shoulder',
    trend: 'up',
    level: 'deload',
    history: [55, 58, 62, 65, 70, 75, 78, 82, 85, 88, 92, 95, 96, 98],
    advice: 'Deload recommended. Skip handstand work 3 days, replace with mobility.',
  },
];

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

function Sparkline({ values, level }: { values: number[]; level: Joint['level'] }) {
  const max = Math.max(...values, 1);
  const stroke =
    level === 'ok'
      ? 'stroke-success'
      : level === 'watch'
        ? 'stroke-warning'
        : 'stroke-danger';
  const w = 240;
  const h = 48;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-12 w-full ${stroke}`}
      role="img"
      aria-label="14-day strain"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TendonInsightWireframe() {
  const [params] = useSearchParams();
  const state = (params.get('state') ?? 'success') as 'loading' | 'success';

  if (state === 'loading') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Insights" title="Tendon load" />
        <Skeleton variant="block" className="h-32" />
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights · Pro"
        title="Tendon load"
        description="Strain by joint pathway over the last 14 days. Auto-flagged for deload."
        actions={
          <span className="chip bg-primary/15 text-primary">Pro feature</span>
        }
      />

      <Section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatChip label="Avg strain" value="68" tone="warning" />
          <StatChip label="Watchlist" value="1" tone="warning" />
          <StatChip label="Deload now" value="1" tone="danger" />
        </div>
      </Section>

      <Section title="Joint pathways">
        <div className="space-y-4">
          {JOINTS.map((j) => {
            const tone =
              j.level === 'ok'
                ? 'border-success/30'
                : j.level === 'watch'
                  ? 'border-warning/40'
                  : 'border-danger/50';
            return (
              <article
                key={j.name}
                className={`card space-y-3 border-l-4 ${tone}`}
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold">{j.name}</h3>
                    <p className="text-xs text-surface-fg-subtle">
                      pathway: {j.pathway}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="chip">
                      {(() => {
                        const I = TREND_ICON[j.trend];
                        return <I aria-hidden className="h-3 w-3" />;
                      })()}
                      {j.trend}
                    </span>
                    {j.level === 'deload' && (
                      <span className="chip text-danger">
                        <AlertTriangle aria-hidden className="h-3 w-3" /> deload
                      </span>
                    )}
                  </div>
                </header>
                <Sparkline values={j.history} level={j.level} />
                <p className="text-sm text-surface-fg-muted">{j.advice}</p>
              </article>
            );
          })}
        </div>
      </Section>
    </div>
  );
}