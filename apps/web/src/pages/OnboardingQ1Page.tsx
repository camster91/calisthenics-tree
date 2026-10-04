/**
 * /onboarding/q1 — pull-up screening question.
 *
 * If yes → next screen is Q2 (front-lever support hold)
 * If no  → next screen is Q2 (active hang)
 *
 * Brand Lock V3: first placement step carries the onboarding hero art —
 * a panel on top on mobile, beside the question on desktop. A black
 * gradient sits between the art and the copy so text never lands on the
 * busy part of the image. Answer buttons are 64px tall tap targets.
 */
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { useOnboarding } from '../lib/onboarding';
import { useT } from '../lib/i18n';
import { OnboardingLayout } from '../components/layout/OnboardingLayout';

const ANSWER_CLASS =
  'group flex min-h-16 w-full items-center gap-4 rounded-xl border border-surface-border bg-surface-subtle px-5 py-4 text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:border-primary/60 hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10';

export default function OnboardingQ1Page() {
  const t = useT();
  const navigate = useNavigate();
  const { answers, setCanPullUp } = useOnboarding();

  const handleChoose = (v: boolean) => {
    setCanPullUp(v);
    navigate('/onboarding/q2');
  };

  return (
    <OnboardingLayout currentStep={1} totalSteps={4} wide>
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-12">
        {/* Hero art — top on mobile, right-hand side on desktop. */}
        <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl md:order-2">
          <img
            src="/brand/img/onboarding-handstand.webp"
            width={1400}
            height={1871}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="h-64 w-full object-cover object-[50%_45%] sm:h-80 md:aspect-[1400/1871] md:h-auto md:max-h-[70vh]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent md:h-1/3"
          />
        </div>

        <div className="space-y-8 md:order-1">
          <header className="space-y-3">
            <p className="text-sm font-medium text-surface-fg-muted">Question 1 of 4</p>
            <h1 className="display-hero text-balance text-5xl sm:text-6xl">
              {t('onboarding.q1')}
            </h1>
            <p className="max-w-md text-base leading-body text-surface-fg-muted">
              {t('onboarding.q1Hint')}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-3" data-testid="onboarding-q1-options">
            <button
              type="button"
              onClick={() => handleChoose(true)}
              className={ANSWER_CLASS}
              data-testid="onboarding-q1-yes"
              aria-pressed={answers.can_pull_up === true}
            >
              <span
                aria-hidden
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-success/15 text-accent-success"
              >
                <Check aria-hidden className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold text-surface-fg">
                {t('onboarding.q1Yes')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleChoose(false)}
              className={ANSWER_CLASS}
              data-testid="onboarding-q1-no"
              aria-pressed={answers.can_pull_up === false}
            >
              <span
                aria-hidden
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-surface-fg-muted"
              >
                <X aria-hidden className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold text-surface-fg">
                {t('onboarding.q1No')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
