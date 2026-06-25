/**
 * NodeCard — single progression node card.
 *
 * Displays: name, target (sets×reps or sets×secs), intensity badge,
 * state pill (locked / unlocked / current).
 *
 * Used in the DAG browse screen and the workout setup screen.
 */
import { Lock, Play, Target, Timer } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';
import type { WorkoutNode } from './types';

export interface NodeCardProps {
  node: WorkoutNode;
  onSelect?: (node: WorkoutNode) => void;
  className?: string;
}

function intensityTier(f: number): 'light' | 'moderate' | 'heavy' | 'extreme' {
  if (f < 0.3) return 'light';
  if (f < 0.6) return 'moderate';
  if (f < 0.85) return 'heavy';
  return 'extreme';
}

const INTENSITY_LABEL: Record<ReturnType<typeof intensityTier>, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  extreme: 'Extreme',
};

const INTENSITY_VARIANT: Record<
  ReturnType<typeof intensityTier>,
  'success' | 'default' | 'warning' | 'danger'
> = {
  light: 'success',
  moderate: 'default',
  heavy: 'warning',
  extreme: 'danger',
};

export function NodeCard({ node, onSelect, className }: NodeCardProps) {
  const intensity = intensityTier(node.intensityFactor);
  const target = node.targetHoldSecs
    ? `${node.targetSets} × ${node.targetHoldSecs}s hold`
    : node.targetReps
      ? `${node.targetSets} × ${node.targetReps} reps`
      : `${node.targetSets} sets`;

  const stateBadge =
    node.state === 'locked' ? (
      <Badge variant="outline" className="gap-1">
        <Lock className="h-3 w-3" aria-hidden /> Locked
      </Badge>
    ) : node.state === 'current' ? (
      <Badge variant="primary" className="gap-1">
        <Play className="h-3 w-3" aria-hidden /> Current
      </Badge>
    ) : (
      <Badge variant="default">Unlocked</Badge>
    );

  const isInteractive = node.state !== 'locked' && !!onSelect;

  return (
    <Card
      data-state={node.state}
      data-intensity={intensity}
      className={cn(
        'transition-shadow',
        node.state === 'current' && 'shadow-[0_0_24px_-4px_rgb(249_115_22_/_0.5)]',
        // Locked: dim border + dimmer ink via opacity-replacement — we avoid
        // `opacity` because it confuses axe-core's effective-contrast math.
        // Setting the card to a desaturated surface-muted keeps interior text
        // contrast within WCAG AA against the existing tokens.
        node.state === 'locked' && ['bg-surface-muted/40', 'border-surface-border/60'],
        className,
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight">{node.name}</h3>
          {stateBadge}
        </div>

        <div className="flex items-center gap-3 text-sm text-surface-fg-muted">
          <span className="inline-flex items-center gap-1">
            {node.targetHoldSecs ? (
              <Timer className="h-4 w-4" aria-hidden />
            ) : (
              <Target className="h-4 w-4" aria-hidden />
            )}
            {target}
          </span>
          <span aria-hidden>·</span>
          <span className="capitalize">{node.movementType}</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={INTENSITY_VARIANT[intensity]}>{INTENSITY_LABEL[intensity]}</Badge>
          {isInteractive && (
            <Button size="sm" variant="default" onClick={() => onSelect(node)}>
              Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}