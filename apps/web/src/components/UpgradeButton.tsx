/**
 * UpgradeButton — small CTA that routes to /pricing.
 *
 * Two visual variants:
 *   - 'primary' (default) — full pill, for empty-state CTAs in paywall
 *     dialogs and Settings page banners.
 *   - 'subtle'            — text + arrow, for inline placement near a
 *     locked feature (e.g. next to a feature that's grayed out in a list).
 *
 * Skips rendering for already-paid users (they shouldn't see "Upgrade"
 * buttons in the first place — hide it cleanly).
 */

import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './ui/button';
import { useSubscription } from '../lib/useSubscription';

export type UpgradeButtonVariant = 'primary' | 'subtle';

export interface UpgradeButtonProps {
  variant?: UpgradeButtonVariant;
  /** Optional callback fired before navigation (e.g. close a parent dialog). */
  onClick?: () => void;
  /** Override the default '/pricing' destination. */
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export function UpgradeButton({
  variant = 'primary',
  onClick,
  href = '/pricing',
  className,
  children,
}: UpgradeButtonProps) {
  const navigate = useNavigate();
  const { isPaid, status } = useSubscription();

  // Hide entirely for paid users. Don't render during the initial
  // loading state — that flicker is worse than a brief gap.
  if (status === 'ok' && isPaid) return null;

  if (variant === 'subtle') {
    return (
      <button
        type="button"
        onClick={() => {
          onClick?.();
          navigate(href);
        }}
        className={
          'inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ' +
          (className ?? '')
        }
      >
        {children ?? 'Upgrade to Pro'}
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <Button
      variant="default"
      className={className}
      onClick={() => {
        onClick?.();
        navigate(href);
      }}
    >
      <Sparkles aria-hidden className="h-4 w-4" />
      {children ?? 'Upgrade to Pro'}
    </Button>
  );
}