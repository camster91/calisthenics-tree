import { useId } from 'react';
import VisuallyHidden from './VisuallyHidden';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Optional helper text below the label, also read by screen readers. */
  description?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Toggle — a labeled switch with proper ARIA semantics.
 *
 * Built on a button with role="switch" so keyboard (Space/Enter to
 * toggle) and screen reader support work. The label and any description
 * are visible text *and* are linked to the switch via aria-labelledby /
 * aria-describedby.
 *
 * WCAG:
 *  - 2.1.1 Keyboard (Space/Enter toggles)
 *  - 4.1.2 Name, Role, Value (role=switch + aria-checked + labelledby)
 *  - 2.5.5 Target Size (min 48dp — outer hit area is 48px)
 */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;
  const labelId = `${toggleId}-label`;
  const descriptionId = description ? `${toggleId}-desc` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex flex-col gap-1">
        <span
          id={labelId}
          className="text-base font-medium text-surface-fg"
        >
          {label}
        </span>
        {description && (
          <span
            id={descriptionId}
            className="text-sm text-surface-fg-muted"
          >
            {description}
          </span>
        )}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full',
          'transition-colors focus-visible:outline-2 focus-visible:outline-primary',
          'focus-visible:outline-offset-2',
          checked ? 'bg-primary' : 'bg-surface-muted',
          disabled && 'opacity-50 cursor-not-allowed',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ minHeight: 48, minWidth: 48, padding: 0 }}
      >
        <span
          aria-hidden
          className={[
            'inline-block h-6 w-6 transform rounded-full bg-white shadow',
            'transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0.5',
          ].join(' ')}
        />
        <VisuallyHidden>{checked ? 'On' : 'Off'}</VisuallyHidden>
      </button>
    </div>
  );
}
