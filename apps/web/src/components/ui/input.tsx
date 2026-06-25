/**
 * Input — text input primitive.
 *
 * 48dp min-height by default (workout floor). Large text (16px) to avoid
 * iOS zoom-on-focus. Invalid variant for form errors.
 */
import * as React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-12 w-full rounded-md border border-surface-border bg-surface px-4 py-2',
        'text-base text-surface-fg placeholder:text-surface-fg-subtle',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        invalid && 'border-danger focus-visible:ring-danger',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };