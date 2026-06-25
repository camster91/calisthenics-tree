/**
 * Label — accessible label primitive.
 *
 * Always pair with a form control via `htmlFor`. Provides a visible
 * label and correct aria association for screen readers.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      data-slot="label"
      className={cn(
        'text-sm font-medium leading-none text-surface-fg',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Label };