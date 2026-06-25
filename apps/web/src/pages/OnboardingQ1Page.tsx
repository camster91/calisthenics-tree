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
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t('onboarding.q1')}</h1>
          <p className="text-sm text-surface-fg-muted">{t('onboarding.q1Hint')}</p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="onboarding-q1-options">
          <button
            type="button"
            onClick={() => handleChoose(true)}
            className="card flex items-start gap-3 p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q1-yes"
            aria-pressed={answers.can_pull_up === true}
          >
            <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold">{t('onboarding.q1Yes')}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleChoose(false)}
            className="card flex items-start gap-3 p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="onboarding-q1-no"
            aria-pressed={answers.can_pull_up === false}
          >
            <X aria-hidden className="mt-1 h-5 w-5 shrink-0 text-surface-fg-muted" />
            <div className="min-w-0 flex-1">
              <span className="block text-base font-semibold">{t('onboarding.q1No')}</span>
            </div>
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}