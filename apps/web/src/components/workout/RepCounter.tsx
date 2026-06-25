/**
 * RepCounter — chunky -/+ with a huge central number.
 *
 * - 48dp tap targets on the buttons (WCAG 2.5.5).
 * - Haptic on every change.
 * - Clamps to [min, max].
 * - Big, legible central number, font-mono for tabular alignment.
 */
import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useHaptic } from '../../lib/useHaptic';

export interface RepCounterProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Label shown above the number, e.g. "Pull-ups". */
  label?: string;
  className?: string;
}

export function RepCounter({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  className,
}: RepCounterProps) {
  const haptic = useHaptic();
  const decrement = useCallback(() => {
    if (value <= min) return;
    haptic('tap');
    onChange(value - 1);
  }, [value, min, onChange, haptic]);

  const increment = useCallback(() => {
    if (value >= max) return;
    haptic('success');
    onChange(value + 1);
  }, [value, max, onChange, haptic]);

  return (
    <div
      role="group"
      aria-label={label ?? 'Rep counter'}
      className={cn('flex flex-col items-center gap-3', className)}
    >
      {label && (
        <span className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted">
          {label}
        </span>
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Decrement"
          onClick={decrement}
          disabled={value <= min}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 border-surface-border bg-surface text-surface-fg',
            'transition-colors active:bg-surface-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <Minus className="h-6 w-6" aria-hidden />
        </button>

        <div
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'flex h-32 w-32 items-center justify-center rounded-full',
            'bg-surface-subtle border-2 border-primary/40',
            'shadow-[0_0_30px_-6px_rgb(249_115_22_/_0.4)]',
          )}
        >
          <span className="font-mono text-7xl font-bold tabular-nums leading-none">
            {value}
          </span>
        </div>

        <button
          type="button"
          aria-label="Increment"
          onClick={increment}
          disabled={value >= max}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-on',
            'transition-colors active:bg-primary-active',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}