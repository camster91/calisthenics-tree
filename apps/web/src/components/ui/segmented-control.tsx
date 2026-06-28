/**
 * SegmentedControl — iOS-style segmented picker.
 *
 * Apple's preferred control for binary or multi-state choices (Apple Music
 * "Songs / Albums / Artists", Fitness+ "Yoga / Strength / HIIT").
 *
 * Renders a row of segments with a sliding indicator behind the active one.
 * Built on Radix Tabs (which provides the accessibility plumbing) so it
 * works with arrow-key navigation, aria-selected, etc.
 *
 * Used in: Settings (theme toggle — replaced by separate component),
 * ProfilePage (Public / Private), InsightsPage (week / month / all-time).
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const segmentListVariants = cva(
  // Squircle outer container, muted background, no visible border
  'inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1',
);

const segmentTriggerVariants = cva(
  // Each segment — squircle, animates background + scale on press
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-md',
    'text-sm font-medium text-surface-fg-muted',
    'transition-[background-color,color,transform] duration-[150ms] ease-out',
    'active:scale-[0.97] active:duration-[80ms]',
    // Active state — primary accent background, white text
    'data-[state=active]:bg-surface data-[state=active]:text-surface-fg',
    'data-[state=active]:shadow-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

interface SegmentedControlProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  segments: Array<{ value: string; label: React.ReactNode; disabled?: boolean }>;
  size?: VariantProps<typeof segmentTriggerVariants>['size'];
}

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  SegmentedControlProps
>(({ segments, size, className, ...props }, ref) => (
  <TabsPrimitive.Root ref={ref} {...props}>
    <TabsPrimitive.List
      className={cn(segmentListVariants(), className)}
      data-slot="segmented-control"
    >
      {segments.map((seg) => (
        <TabsPrimitive.Trigger
          key={seg.value}
          value={seg.value}
          disabled={seg.disabled}
          className={segmentTriggerVariants({ size })}
        >
          {seg.label}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
    {/* Children of caller render the content per value */}
  </TabsPrimitive.Root>
));
SegmentedControl.displayName = 'SegmentedControl';

export { SegmentedControl };