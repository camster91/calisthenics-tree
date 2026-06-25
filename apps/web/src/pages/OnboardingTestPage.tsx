/**
 * /onboarding/test — RIR-2 push-up test.
 *
 * User enters how many push-ups they did to near-failure (RIR-2:
 * Reps in Reserve = 2). Backend uses this to offset the placement.
 *
 * Guards: Q1+Q2 must be answered before this screen. Otherwise redirect.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOnboarding } from '../lib/onboarding';
import { useT } from '../lib/i18n';
import { OnboardingLayout } from '../components/layout/OnboardingLayout';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function OnboardingTestPage() {
  const t = useT();
  const navigate = useNavigate();
  const { answers, setRir2PushupReps } = useOnboarding();

  const [reps, setReps] = useState<string>(
    answers.rir2_pushup_reps !== null ? String(answers.rir2_pushup_reps) : '',
  );

  useEffect(() => {
    // Guard: Q1+Q2 must be answered.
    const q1Done = answers.can_pull_up !== null;
    const q2Done =
      answers.can_pull_up === true
        ? answers.support_hold_15s !== null
        : answers.active_hang_10s !== null;
    if (!q1Done || !q2Done) {
      navigate('/onboarding/q1', { replace: true });
    }
  }, [answers, navigate]);

  const parsed = reps.trim() === '' ? null : parseInt(reps, 10);
  const isValid = parsed !== null && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;

  const handleNext = () => {
    if (parsed === null || !isValid) return;
    setRir2PushupReps(parsed);
    navigate('/onboarding/result');
  };

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={4}
      backHref="/onboarding/q2"
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t('onboarding.test')}</h1>
          <p className="text-sm text-surface-fg-muted">{t('onboarding.testBody')}</p>
        </header>

        <div className="card space-y-3">
          <Label htmlFor="reps">{t('onboarding.test')}</Label>
          <Input
            id="reps"
            name="reps"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            placeholder={t('onboarding.testPlaceholder')}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            invalid={reps !== '' && !isValid}
            autoFocus
            className="text-2xl"
            data-testid="onboarding-reps-input"
          />
          <p className="text-xs text-surface-fg-muted">{t('onboarding.testHint')}</p>
        </div>
      </div>
    </OnboardingLayout>
  );
}