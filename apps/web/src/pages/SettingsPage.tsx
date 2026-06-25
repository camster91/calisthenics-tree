/**
 * SettingsPage — Display, account, and preferences.
 *
 * Houses the gym-glare toggle (T38). Shows the current source of the
 * theme (auto-detect vs manual override) so the user can tell why the
 * mode is on.
 *
 * Includes a Display name form to exercise the aria-live form-error
 * pattern (T38 deliverable: form errors announced via aria-live='polite').
 */
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../lib/theme';
import Toggle from '../components/ui/Toggle';
import { Sun, Moon, Eye, MonitorSmartphone, Check } from 'lucide-react';

const STORAGE_KEY = 'ct:theme';

function detectAutoContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
}

function readStoredTheme(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function hasManualOverride(): boolean {
  const stored = readStoredTheme();
  return stored === 'gym-glare' || stored === 'default';
}

export default function SettingsPage() {
  const [theme, setTheme] = useTheme();
  const [autoContrast, setAutoContrast] = useState(detectAutoContrast);
  const [hasOverride, setHasOverride] = useState(hasManualOverride);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Track OS-level contrast preference so the UI can show "auto-detected".
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-contrast: more)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setAutoContrast(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Re-evaluate override state when theme changes (so source label updates
  // right after the user flips the toggle).
  useEffect(() => {
    setHasOverride(hasManualOverride());
  }, [theme]);

  // Live region: keep error text in sync. The element itself already
  // has role="alert" + aria-live="assertive" so it announces on update.
  useEffect(() => {
    if (errorRef.current) {
      errorRef.current.textContent = nameError ?? '';
    }
  }, [nameError]);

  const isGymGlare = theme === 'gym-glare';
  const themeSource: 'auto' | 'manual' =
    isGymGlare && autoContrast && !hasOverride ? 'auto' : 'manual';

  function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setNameError('Display name is required.');
      setNameSaved(false);
      return;
    }
    if (trimmed.length > 32) {
      setNameError('Display name must be 32 characters or fewer.');
      setNameSaved(false);
      return;
    }
    setNameError(null);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 3000);
  }

  return (
    <div className="space-y-12 max-w-2xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-surface-fg-muted">
          Tune the app for how and where you train.
        </p>
      </header>

      {/* ====================== DISPLAY ====================== */}
      <section
        aria-labelledby="display-heading"
        className="card space-y-1 divide-y divide-surface-border"
      >
        <div className="pb-3 flex items-center gap-3">
          <MonitorSmartphone
            className="h-5 w-5 text-primary"
            aria-hidden
          />
          <h2
            id="display-heading"
            className="text-xl font-semibold"
          >
            Display
          </h2>
        </div>

        <Toggle
          label="Gym-glare mode"
          description={
            isGymGlare && autoContrast
              ? 'On — matched your OS contrast preference (more). Tap to override.'
              : isGymGlare
                ? 'On — high-contrast theme for outdoor / sweaty use.'
                : autoContrast
                  ? 'Off — your OS prefers more contrast, but you have not turned this on.'
                  : 'Off — default dark theme. Turn on for outdoor / sweaty use.'
          }
          checked={isGymGlare}
          onChange={(next) => setTheme(next ? 'gym-glare' : 'default')}
        />

        <p
          className="pt-2 text-xs text-surface-fg-subtle"
          aria-live="polite"
        >
          Source:{' '}
          {themeSource === 'auto'
            ? 'auto-detected (prefers-contrast: more)'
            : 'manual override'}{' '}
          ·{' '}
          {isGymGlare
            ? 'AAA contrast (7:1) is active.'
            : 'AA contrast (4.5:1) is active.'}
        </p>
      </section>

      {/* ====================== ACCOUNT ====================== */}
      <section
        aria-labelledby="account-heading"
        className="card space-y-4"
      >
        <div className="flex items-center gap-3">
          <Sun className="h-5 w-5 text-primary" aria-hidden />
          <h2
            id="account-heading"
            className="text-xl font-semibold"
          >
            Account
          </h2>
        </div>

        <form
          onSubmit={handleNameSave}
          noValidate
          className="space-y-3"
        >
          <div>
            <label
              htmlFor="display-name"
              className="block text-sm font-medium text-surface-fg"
            >
              Display name
            </label>
            <input
              id="display-name"
              name="display-name"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (nameError) setNameError(null);
                if (nameSaved) setNameSaved(false);
              }}
              aria-invalid={nameError ? 'true' : 'false'}
              aria-describedby={
                nameError
                  ? 'display-name-error'
                  : 'display-name-hint'
              }
              maxLength={64}
              autoComplete="nickname"
              className={[
                'mt-1 block w-full rounded-md border bg-surface px-3 py-2 text-base',
                'text-surface-fg placeholder:text-surface-fg-subtle',
                'focus-visible:outline-2 focus-visible:outline-primary',
                'focus-visible:outline-offset-2',
                nameError
                  ? 'border-danger'
                  : 'border-surface-border focus:border-primary',
              ].join(' ')}
              style={{ minHeight: 48 }}
            />
            {nameError ? (
              <p
                id="display-name-error"
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                className="mt-1 text-sm text-danger"
              >
                {nameError}
              </p>
            ) : (
              <p
                id="display-name-hint"
                className="mt-1 text-xs text-surface-fg-muted"
              >
                1–32 characters. Shown on your share cards.
              </p>
            )}
            {nameSaved && (
              <p
                role="status"
                aria-live="polite"
                className="mt-1 flex items-center gap-1 text-sm text-success"
              >
                <Check
                  className="h-4 w-4"
                  aria-hidden
                />
                Saved.
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </form>
      </section>

      {/* ====================== ICON-ONLY BUTTON EXAMPLE ======================
          Demonstrates the icon-only-button accessible-name pattern. */}
      <section
        aria-labelledby="example-heading"
        className="card space-y-4"
      >
        <div className="flex items-center gap-3">
          <Eye
            className="h-5 w-5 text-primary"
            aria-hidden
          />
          <h2
            id="example-heading"
            className="text-xl font-semibold"
          >
            Icon-only controls
          </h2>
        </div>
        <p className="text-sm text-surface-fg-muted">
          These buttons are icon-only and labelled for screen readers
          via aria-label.
        </p>
        <div className="flex flex-wrap gap-3">
          <IconOnlyButton
            label="Switch to light mode"
            icon={<Sun className="h-5 w-5" aria-hidden />}
          />
          <IconOnlyButton
            label="Switch to dark mode"
            icon={<Moon className="h-5 w-5" aria-hidden />}
          />
        </div>
      </section>
    </div>
  );
}

interface IconOnlyButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

/** Icon-only button with aria-label. Used as the canonical example. */
function IconOnlyButton({ label, icon, onClick }: IconOnlyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-md border border-surface-border bg-surface-subtle text-surface-fg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      style={{ minHeight: 48, minWidth: 48, padding: 12 }}
    >
      {icon}
    </button>
  );
}
