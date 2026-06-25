/**
 * SetChecklist — row of numbered squares for tracking sets within an exercise.
 *
 * - 3-5 squares, current set glows primary.
 * - Tap a square to mark it complete (haptic on completion).
 * - Tap the current/next square again to undo.
 */
import { useCallback } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useHaptic } from '../../lib/useHaptic';

export interface SetChecklistProps {
  /** Total number of sets in this exercise (3-5). */
  total: number;
  /** Indices that have been completed (0-based). */
  completed: number[];
  /** Called with the new completed-set list after a tap. */
  onChange: (next: number[]) => void;
  /** Optional caption above the row. */
  label?: string;
  className?: string;
}

export function SetChecklist({
  total,
  completed,
  onChange,
  label,
  className,
}: SetChecklistProps) {
  const haptic = useHaptic();

  const tap = useCallback(
    (i: number) => {
      const wasComplete = completed.includes(i);
      const next = wasComplete ? completed.filter((x) => x !== i) : [...completed, i].sort();
      haptic(wasComplete ? 'tap' : 'success');
      onChange(next);
    },
    [completed, onChange, haptic],
  );

  return (
    <div
      role="group"
      aria-label={label ?? 'Set checklist'}
      className={cn('flex flex-col gap-2', className)}
    >
      {label && (
        <span className="text-sm font-semibold uppercase tracking-wider text-surface-fg-muted">
          {label}
        </span>
      )}
      <ol className="flex flex-wrap gap-3">
        {Array.from({ length: total }, (_, i) => {
          const isComplete = completed.includes(i);
          const isCurrent = !isComplete && !completed.includes(i + 1) && i === completed.length;
          return (
            <li key={i}>
              <button
                type="button"
                aria-pressed={isComplete}
                aria-label={`Set ${i + 1}${isComplete ? ' (complete)' : ''}`}
                onClick={() => tap(i)}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-md border-2 font-mono text-base font-semibold',
                  'transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  isComplete
                    ? 'border-success bg-success/20 text-success'
                    : isCurrent
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_20px_-4px_rgb(249_115_22_/_0.6)]'
                      : 'border-surface-border bg-surface text-surface-fg-muted hover:border-surface-fg-subtle',
                )}
              >
                {isComplete ? <Check className="h-6 w-6" aria-hidden /> : i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}