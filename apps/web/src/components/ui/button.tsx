/**
 * Button — shadcn/ui primitive, ported to Tailwind v4 + our design tokens.
 *
 * Variants: default | primary | ghost | outline | destructive | secondary
 * Sizes:    sm | md | lg | icon (+ touch-target floor for workout use)
 *
 * Built on Radix Slot for asChild composition (icon-only icon buttons,
 * link-as-button, etc.) and CVA for variant typing.
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  // base — shared by every variant
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium',
    'transition-colors duration-[150ms]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-on hover:bg-primary-hover active:bg-primary-active',
        // destructive uses red-700 (#B91C1C) for 7:1 contrast on white (WCAG AA + AAA normal text).
        destructive: 'bg-red-700 text-white hover:bg-red-800',
        outline:
          'border border-surface-border bg-transparent text-surface-fg hover:bg-surface-muted',
        secondary: 'bg-surface-muted text-surface-fg hover:bg-surface-muted/80',
        ghost: 'bg-transparent text-surface-fg hover:bg-surface-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-12 px-4', // 48dp tap target — WCAG 2.5.5 floor
        lg: 'h-14 px-6 text-base',
        xl: 'h-16 px-8 text-lg', // workout-floor, dominant CTAs
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };