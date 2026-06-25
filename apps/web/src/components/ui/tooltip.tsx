/**
 * Tooltip — accessible tooltip built on Radix.
 *
 * The Provider is required at the app root so all tooltips share the
 * same delay/duration. Consumers wrap their app in <TooltipProvider>.
 */
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-toast overflow-hidden rounded-md border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs text-surface-fg shadow-md',
      'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
      'data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };