/**
 * TendonStrainCard — per-pathway strain status with 4-week sparkline.
 *
 * - Status badge: ok / watch / deload.
 * - Sparkline drawn inline with SVG (no chart lib).
 * - Used in the Insights screen; could also be a toast on regress.
 */
import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { TendonPathwayStatus } from './types';

const STATUS_LABEL: Record<TendonPathwayStatus['status'], string> = {
  ok: 'OK',
  watch: 'Watch',
  deload: 'Deload',
};

const STATUS_VARIANT: Record<TendonPathwayStatus['status'], 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  watch: 'warning',
  deload: 'danger',
};

const PATHWAY_LABEL: Record<TendonPathwayStatus['pathway'], string> = {
  bent_arm_elbow: 'Bicep / elbow',
  bent_arm_shoulder: 'Pull shoulder',
  straight_arm_elbow: 'Tricep / elbow',
  straight_arm_shoulder: 'Push shoulder',
  core_lumbar: 'Lower back',
  core_hip_flexor: 'Hip flexor',
  wrist: 'Wrist',
};

function Sparkline({
  values,
  trend,
}: {
  values: TendonPathwayStatus['sparkline'];
  trend: 'up' | 'down' | 'flat';
}) {
  const max = 100;
  const min = 0;
  const w = 120;
  const h = 32;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(' L ')}`;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-2">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`4-week trend: ${values.join(', ')}`}
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <TrendIcon className="h-4 w-4 opacity-70" aria-hidden />
    </div>
  );
}

export interface TendonStrainCardProps {
  statuses: TendonPathwayStatus[];
  className?: string;
}

export function TendonStrainCard({ statuses, className }: TendonStrainCardProps) {
  const withTrend = useMemo(
    () =>
      statuses.map((s) => {
        const first = s.sparkline[0];
        const last = s.sparkline[s.sparkline.length - 1];
        const delta = last - first;
        const trend: 'up' | 'down' | 'flat' = Math.abs(delta) < 5 ? 'flat' : delta > 0 ? 'up' : 'down';
        return { ...s, trend };
      }),
    [statuses],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tendon strain</CardTitle>
        <p className="text-xs text-surface-fg-muted">4-week rolling stress index, per pathway.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {withTrend.map((s) => (
          <div
            key={s.pathway}
            className="flex items-center justify-between gap-4 rounded-md border border-surface-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{PATHWAY_LABEL[s.pathway]}</div>
              <div className="text-xs text-surface-fg-subtle">
                {s.sparkline[s.sparkline.length - 1]} stress
              </div>
            </div>
            <Sparkline values={s.sparkline} trend={s.trend} />
            <Badge
              variant={STATUS_VARIANT[s.status]}
            >
              {STATUS_LABEL[s.status]}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}