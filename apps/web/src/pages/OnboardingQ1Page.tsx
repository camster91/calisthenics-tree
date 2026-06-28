/**
 * /onboarding/q1 — pull-up screening question.
 *
 * If yes → next screen is Q2 (front-lever support hold)
 * If no  → next screen is Q2 (active hang)
 */
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { useOnboarding } from '../lib/onboarding';
import { useT } from '../lib/i18n';
import { OnboardingLayout } from '../components/layout/OnboardingLayout';

export default function OnboardingQ1Page() {
  const t = useT();
  const navigate = useNavigate();
  const { answers, setCanPullUp } = useOnboarding();

  const handleChoose = (v: boolean) => {
    setCanPullUp(v);
    navigate('/onboarding/q2');
  };

  return (
    <OnboardingLayout currentStep={1} totalSteps={4}>
      <div className="space-y-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="display-eyebrow">Question 1 of 4</p>
          <h1 className="text-balance text-4xl font-bold leading-heading tracking-tighter sm:text-5xl">
            {t('onboarding.q1')}
          </h1>
          <p className="max-w-xl text-base leading-body text-surface-fg-muted">
            {t('onboarding.q1Hint')}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="onboarding-q1-options">
          <button
            type="button"
            onClick={() => handleChoose(true)}
            className="group flex items-start gap-4 rounded-xl border border-surface-border bg-surface-subtle p-5 text-left transition-all duration-150 ease-out hover:scale-[1.02] hover:border-primary/50 hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q1-yes"
            aria-pressed={answers.can_pull_up === true}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-success/15 text-accent-success transition-colors group-hover:bg-accent-success/25"
            >
              <Check aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <span className="block text-lg font-bold tracking-tighter text-surface-fg">
                {t('onboarding.q1Yes')}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleChoose(false)}
            className="group flex items-start gap-4 rounded-xl border border-surface-border bg-surface-subtle p-5 text-left transition-all duration-150 ease-out hover:scale-[1.02] hover:border-primary/50 hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q1-no"
            aria-pressed={answers.can_pull_up === false}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-surface-fg-muted transition-colors group-hover:bg-surface-muted/80"
            >
              <X aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <span className="block text-lg font-bold tracking-tighter text-surface-fg">
                {t('onboarding.q1No')}
              </span>
            </div>
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}