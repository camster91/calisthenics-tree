/**
 * EmptyState — shared empty-list treatment (Brand Lock V3).
 *
 * The rule: the empty-node illustration, one sentence, one action.
 * Optional `hint` is for a single supporting line when the sentence alone
 * can't explain what fills the space (keep it short).
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { cn } from '../../lib/cn';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The one sentence. */
  message: React.ReactNode;
  /** Optional short supporting line. */
  hint?: React.ReactNode;
  /** The one action. Omit only when there is genuinely nothing to do. */
  action?: { label: string; to: string; testId?: string };
  /** Illustration edge in px (120-160 reads best). */
  imageSize?: number;
}

export function EmptyState({
  message,
  hint,
  action,
  imageSize = 136,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl border border-surface-border bg-surface-subtle px-5 py-8 text-center',
        className,
      )}
      {...props}
    >
      <img
        src="/brand/img/empty-node.webp"
        width={imageSize}
        height={imageSize}
        alt=""
        loading="lazy"
        decoding="async"
        className="rounded-lg"
        style={{ width: imageSize, height: imageSize }}
      />
      <div className="max-w-sm space-y-1.5">
        <p className="text-pretty text-base font-medium text-surface-fg">{message}</p>
        {hint && (
          <p className="text-pretty text-sm leading-body text-surface-fg-muted">{hint}</p>
        )}
      </div>
      {action && (
        <Link
          to={action.to}
          className="btn-primary min-w-[12rem]"
          data-testid={action.testId}
        >
          {action.label}
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
