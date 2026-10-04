/**
 * BigNumber — display-grade numeral for workout counters (reps, hold seconds).
 *
 * Apple Fitness+ shows numbers at 96-128px with weight 800-900, tight tracking,
 * and `tabular-nums` so values don't jiggle as they change. Used in:
 *   - RepCounter (reps / sets / remaining)
 *   - WorkoutTimer (elapsed time, hold countdown)
 *   - WorkoutDonePage hero (sets completed)
 *   - OnboardingResultPage (ranking / rank count)
 *
 * Sizes scale up to display-hero (9xl, 128px) for the workout screen.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const bigNumberVariants = cva(
  // Base — display-grade type. tabular-nums so digits don't shift width.
  [
    // Brand Lock V3: Saira display, condensed (wdth 80), weight 800.
    'font-display font-heavy [font-stretch:80%] leading-display tracking-display tabular-nums',
    'select-none',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'text-4xl',  // 36px — for secondary stats
        md: 'text-5xl',  // 48px — for medium counters
        lg: 'text-6xl',  // 60px — for primary stat
        xl: 'text-7xl',  // 72px — for big counter
        '2xl': 'text-8xl', // 96px — for the main workout counter
        '3xl': 'text-9xl', // 128px — for hero / shared card
      },
      tone: {
        // Default — surface foreground (white)
        default: 'text-surface-fg',
        // Primary — orange, used when the counter IS the focal point of the screen
        primary: 'text-primary',
        // Muted — secondary text color
        muted: 'text-surface-fg-muted',
        // Success — for "PR" / "Promoted" badges
        success: 'text-accent-success',
      },
    },
    defaultVariants: { size: 'lg', tone: 'default' },
  },
);

export interface BigNumberProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof bigNumberVariants> {
  /** When true, the number is rendered as a separate inline element so CSS
   *  transitions can animate it (for rep counters ticking up). */
  asChild?: boolean;
}

const BigNumber = React.forwardRef<HTMLSpanElement, BigNumberProps>(
  ({ className, size, tone, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="big-number"
      className={cn(bigNumberVariants({ size, tone }), className)}
      {...props}
    />
  ),
);
BigNumber.displayName = 'BigNumber';

export { BigNumber, bigNumberVariants };