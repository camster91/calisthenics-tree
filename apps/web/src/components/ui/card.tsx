/**
 * Card — shadcn-style surface primitive.
 *
 * Composable: Card / CardHeader / CardTitle / CardDescription /
 * CardContent / CardFooter. Each is a plain div with sensible defaults;
 * compose them or replace slots with your own elements.
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Squircle radius (--radius-xl = 28px on default, was 16px)
 * - CVA variant: 'glass' for floating cards (workout header over scrolling,
 *   share cards in feed) — backdrop-filter + saturate(180%)
 * - CVA variant: 'hero' for the workout header (28px radius, glow shadow)
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const cardVariants = cva(
  'border text-surface-fg',
  {
    variants: {
      variant: {
        // Default — subtle dark surface, the everyday card
        default: 'rounded-xl border-surface-border bg-surface-subtle shadow-sm',
        // Glass — frosted surface for floating elements over content
        glass: [
          'rounded-xl border-surface-border',
          'bg-[var(--color-glass)]',
          'backdrop-blur-md backdrop-saturate-150',
          'shadow-[var(--shadow-glass)]',
        ].join(' '),
        // Hero — for the workout header / share card hero. Bigger radius,
        // glow shadow, primary accent ring.
        hero: [
          'rounded-2xl border-primary/20 bg-surface-subtle',
          'shadow-[var(--shadow-glow)]',
        ].join(' '),
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(cardVariants({ variant }), className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn('flex flex-col space-y-1.5 p-5', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      // Heavier weight + tighter tracking per display-section utility
      className={cn('text-xl font-bold leading-heading tracking-tighter', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn('text-sm text-surface-fg-muted', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn('p-5 pt-0', className)}
      {...props}
    />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn('flex items-center gap-2 p-5 pt-0', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };