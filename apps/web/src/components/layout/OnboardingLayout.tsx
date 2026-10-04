/**
 * OnboardingLayout — shared chrome for the 4 placement screens.
 *
 * Shows a step indicator + back/next buttons. Designed for the
 * unauthenticated-to-onboarded flow: no app nav (user hasn't seen the
 * full app yet), but with consistent branding.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { BrandMark } from '../brand/BrandMark';

export interface OnboardingLayoutProps {
  currentStep: number;
  totalSteps: number;
  /** Show a "back" button linking to `backHref`. Hidden on step 1. */
  backHref?: string;
  /** Disable the "next" submit (e.g. until required field is filled). */
  nextDisabled?: boolean;
  /** Form submit handler — wraps the "next" button in a form if set. */
  onNext?: () => void;
  /** Wider container (for steps with side-by-side hero art on desktop). */
  wide?: boolean;
  children: React.ReactNode;
}

export function OnboardingLayout({
  currentStep,
  totalSteps,
  backHref,
  nextDisabled,
  onNext,
  wide = false,
  children,
}: OnboardingLayoutProps) {
  const t = useT();
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      className={`mx-auto flex min-h-screen flex-col px-4 py-8 ${
        wide ? 'max-w-5xl' : 'max-w-2xl'
      }`}
    >
      <header className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center rounded-md" aria-label="Calisthenics Tree, home">
            <BrandMark size={26} />
          </Link>
          <span
            className="text-xs text-surface-fg-muted"
            aria-label={`Step ${currentStep} of ${totalSteps}`}
          >
            {t('onboarding.step', { current: currentStep, total: totalSteps })}
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      <footer className="mt-8 flex items-center justify-between gap-4">
        {backHref ? (
          <Link
            to={backHref}
            className="btn-ghost inline-flex items-center gap-2"
            data-testid="onboarding-back"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t('onboarding.back')}
          </Link>
        ) : (
          <span />
        )}

        {onNext ? (
          <button
            type="submit"
            onClick={onNext}
            disabled={nextDisabled}
            className="btn-primary inline-flex items-center gap-2"
            data-testid="onboarding-next"
          >
            {t('onboarding.next')}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        ) : (
          <span />
        )}
      </footer>
    </div>
  );
}