/**
 * /onboarding/q2 — conditional follow-up to Q1.
 *
 * If Q1=yes → ask about front-lever support hold (support_hold_15s)
 * If Q1=no  → ask about active hang (active_hang_10s)
 *
 * If Q1 wasn't answered (direct URL access), redirect to /onboarding/q1.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { useOnboarding } from '../lib/onboarding';
import { useT } from '../lib/i18n';
import { OnboardingLayout } from '../components/layout/OnboardingLayout';

export default function OnboardingQ2Page() {
  const t = useT();
  const navigate = useNavigate();
  const { answers, setSupportHold, setActiveHang } = useOnboarding();

  // Guard: Q1 must be answered before Q2 is meaningful.
  useEffect(() => {
    if (answers.can_pull_up === null) {
      navigate('/onboarding/q1', { replace: true });
    }
  }, [answers.can_pull_up, navigate]);

  if (answers.can_pull_up === null) return null;

  const isPullUp = answers.can_pull_up === true;
  const current = isPullUp ? answers.support_hold_15s : answers.active_hang_10s;
  const title = isPullUp ? t('onboarding.q2Support') : t('onboarding.q2Hang');
  const hint = isPullUp ? t('onboarding.q2SupportHint') : t('onboarding.q2HangHint');
  const yesLabel = isPullUp ? t('onboarding.q2SupportYes') : t('onboarding.q2HangYes');
  const noLabel = isPullUp ? t('onboarding.q2SupportNo') : t('onboarding.q2HangNo');

  const handleChoose = (v: boolean) => {
    if (isPullUp) {
      setSupportHold(v);
    } else {
      setActiveHang(v);
    }
    navigate('/onboarding/test');
  };

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={4}
      backHref="/onboarding/q1"
    >
      <div className="space-y-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="display-eyebrow">Question 2 of 4</p>
          <h1 className="display-section text-balance text-4xl sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-base leading-body text-surface-fg-muted">
            {hint}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="onboarding-q2-options">
          <button
            type="button"
            onClick={() => handleChoose(true)}
            className="group flex items-start gap-4 rounded-xl border border-surface-border bg-surface-subtle p-5 text-left transition-all duration-150 ease-out hover:scale-[1.02] hover:border-primary/50 hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q2-yes"
            aria-pressed={current === true}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-success/15 text-accent-success transition-colors group-hover:bg-accent-success/25"
            >
              <Check aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <span className="block text-lg font-bold tracking-tighter text-surface-fg">
                {yesLabel}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleChoose(false)}
            className="group flex items-start gap-4 rounded-xl border border-surface-border bg-surface-subtle p-5 text-left transition-all duration-150 ease-out hover:scale-[1.02] hover:border-primary/50 hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q2-no"
            aria-pressed={current === false}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-surface-fg-muted transition-colors group-hover:bg-surface-muted/80"
            >
              <X aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <span className="block text-lg font-bold tracking-tighter text-surface-fg">
                {noLabel}
              </span>
            </div>
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}