/**
 * Badge — status pill. Variant matches NodeCard intensity badge uses.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // Solid variants use dark text on bright fill — WCAG AAA contrast.
        // Translucent variants use solid foreground on a darkened solid bg.
        default: 'bg-surface-muted text-surface-fg',
        primary: 'bg-primary text-primary-on',
        success: 'bg-success text-[#052e16]', // green-900 on green-500
        warning: 'bg-warning text-[#451a03]', // amber-900 on amber-500
        // red-700 (#B91C1C) on white = 7:1 contrast, passes WCAG AA + AAA.
        // (red-500 #ef4444 only hits 4.08:1 — fails AA normal text.)
        danger: 'bg-red-700 text-white',
        outline: 'border border-surface-border text-surface-fg',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };