/**
 * SettingsPage — Display, account, and preferences.
 *
 * Houses the gym-glare theme control (Sprint 3A task 3). The control is
 * implemented as a WAI-ARIA radiogroup — each option is a real <button>
 * with role="radio" + aria-checked, the container is role="radiogroup"
 * with aria-label. Keyboard follows the WAI-ARIA APG radiogroup pattern:
 *
 *   - Tab enters / leaves the group (one tab stop, roving tabindex)
 *   - Arrow keys move focus AND change selection
 *   - Home / End jump to first / last
 *   - Space / Enter re-affirm the focused radio (no form submit)
 *
 * Visual: a small swatch pair below the radio shows what each theme
 * actually looks like, using the values in src/tokens.ts (the single
 * source of truth — keeps the preview in sync if a designer ever
 * shifts the colors).
 *
 * Also exercises the aria-live form-error pattern via the Display name
 * input below — errors are announced through role="alert" +
 * aria-live="assertive".
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { useTheme, type ThemeName } from '../lib/theme';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import {
  updateMe,
  ApiError,
} from '../lib/api';
import {
  Sun,
  Moon,
  Eye,
  MonitorSmartphone,
  Check,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { tokens } from '../tokens';
import { cn } from '../lib/cn';
import { DangerZone } from './SettingsPage.DangerZone';
import { useSubscription } from '../lib/useSubscription';

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

// ---------------------------------------------------------------------
// Theme toggle — radiogroup of two cards.
// ---------------------------------------------------------------------

interface ThemeOptionMeta {
  value: ThemeName;
  icon: typeof Moon;
}

/** Theme option order is the visual order in the radiogroup. */
const THEME_OPTIONS: ThemeOptionMeta[] = [
  { value: 'default', icon: Moon },
  { value: 'gym-glare', icon: Sun },
];

/**
 * ThemeToggleGroup — radiogroup with two card-style buttons.
 *
 * A11y:
 *   - role="radiogroup" + aria-label
 *   - each option role="radio" + aria-checked + 48px min tap target
 *   - roving tabindex (only the checked radio is tabIndex=0)
 *   - arrow / Home / End / Space / Enter keyboard support
 */
function ThemeToggleGroup({
  value,
  onChange,
  ariaLabel,
  labels,
  hints,
}: {
  value: ThemeName;
  onChange: (v: ThemeName) => void;
  ariaLabel: string;
  labels: Record<ThemeName, string>;
  hints: Record<ThemeName, string>;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * select — activate option at `index`, then move focus to it.
   * Used by both click and arrow-key handlers so keyboard and pointer
   * converge on the same UX (focus follows selection).
   *
   * Focus is moved synchronously BEFORE onChange so the next keypress
   * (e.g. Space) lands on the newly-checked radio even when tests
   * drive the keyboard rapidly without yielding to a frame.
   */
  const select = useCallback(
    (index: number) => {
      const opt = THEME_OPTIONS[index];
      if (!opt) return;
      const el = refs.current[index];
      if (el) el.focus();
      onChange(opt.value);
    },
    [onChange],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = index;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = (index + 1) % THEME_OPTIONS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (index - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = THEME_OPTIONS.length - 1;
          break;
        case ' ':
        case 'Enter':
          // Re-affirm current selection (don't submit a form by accident)
          // and ensure focus stays on the focused radio.
          e.preventDefault();
          select(index);
          return;
        default:
          return;
      }
      e.preventDefault();
      select(next);
    },
    [select],
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid="theme-radiogroup"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {THEME_OPTIONS.map((opt, index) => {
        const checked = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKey(e, index)}
            data-theme-option={opt.value}
            className={cn(
              'group flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              checked
                ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                : 'border-surface-border bg-surface hover:bg-surface-muted',
            )}
            style={{ minHeight: 48 }}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
                checked
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-muted text-surface-fg-muted group-hover:bg-surface',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-surface-fg">
                {labels[opt.value]}
              </span>
              <span className="mt-0.5 block text-xs text-surface-fg-muted">
                {hints[opt.value]}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                checked
                  ? 'bg-primary text-primary-on'
                  : 'border border-surface-border',
              )}
            >
              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * ThemeSwatches — side-by-side preview of the two themes using the
 * exact token values from src/tokens.ts. Keeps the preview honest: if
 * a designer changes a token, the swatch follows.
 *
 * `aria-hidden` because it's decorative — the radio labels already say
 * which option is which.
 */
function ThemeSwatches() {
  const defaults = tokens.color.surface;
  const glare = tokens.color['gym-glare'];

  return (
    <div
      aria-hidden
      data-testid="theme-swatches"
      className="grid grid-cols-2 gap-3"
    >
      <div
        className="flex flex-col gap-1 rounded-md p-3"
        style={{
          background: defaults.bg,
          color: defaults.fg,
          border: `1px solid ${defaults.border}`,
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          Default
        </span>
        <span className="text-2xl font-bold leading-none">Aa</span>
        <span className="text-[10px] opacity-70">AA · 4.5:1</span>
      </div>
      <div
        className="flex flex-col gap-1 rounded-md p-3"
        style={{
          background: glare.bg,
          color: glare.fg,
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          Gym glare
        </span>
        <span className="text-2xl font-bold leading-none">Aa</span>
        <span className="text-[10px] opacity-70">AAA · 7:1</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Display-name form — exercises aria-live error announcement.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Subscription section — current tier badge + launch notice.
// ---------------------------------------------------------------------
//
// During early access the app is free for everyone; this section just
// shows the Free badge + a one-line "we'll let you know before paid
// launches" message. No Upgrade CTA, no Cancel CTA — those return
// when paid tiers ship (Sprints 16/17 left the billing infrastructure
// dormant for this exact moment).

function SubscriptionSection() {
  const subscription = useSubscription();

  return (
    <section
      aria-labelledby="subscription-heading"
      className="card space-y-3"
      data-testid="subscription-section"
    >
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        <h2
          id="subscription-heading"
          className="text-xl font-semibold"
        >
          Subscription
        </h2>
      </div>

      {subscription.status === 'loading' && (
        <p className="text-sm text-surface-fg-muted">Loading…</p>
      )}

      {subscription.status === 'anonymous' && (
        <p className="text-sm text-surface-fg-muted">
          Sign in to see your plan.
        </p>
      )}

      {subscription.status === 'error' && (
        <p
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700"
        >
          Couldn't load your subscription state. Try refreshing.
        </p>
      )}

      {subscription.status === 'ok' && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-surface-fg-muted">Current plan</span>
            <span
              data-testid="settings-current-tier"
              className="chip bg-primary/15 text-primary"
            >
              Free
            </span>
          </div>
          <p className="text-sm text-surface-fg-muted">
            Everything is free during early access. We'll let you know well
            before any paid tier lands — no surprise charges.
          </p>
        </>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const t = useT();
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useTheme();
  const [autoContrast, setAutoContrast] = useState(detectAutoContrast);
  const [hasOverride, setHasOverride] = useState(hasManualOverride);
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
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

  // TODO(i18n): once the i18n-scaffold task lands a second locale, move
  // the radio option copy into en.json (settings.themeDefault,
  // settings.themeGymGlare already exist) and the long-form hints into
  // settings.themeDefaultHint / settings.themeGymGlareHint. Today the
  // hints are inlined in English so the page never shows blank
  // descriptions.
  const themeOptionLabels: Record<ThemeName, string> = {
    default: t('settings.themeDefault'),
    'gym-glare': t('settings.themeGymGlare'),
  };
  const themeOptionHints: Record<ThemeName, string> = {
    default: 'Standard dark theme — for everyday training.',
    'gym-glare':
      'High-contrast for outdoor / sweaty use (WCAG AAA, 7:1).',
  };

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setNameError(t('settings.displayNameErrorRequired'));
      setNameSaved(false);
      return;
    }
    if (trimmed.length > 32) {
      setNameError(t('settings.displayNameErrorTooLong'));
      setNameSaved(false);
      return;
    }
    setNameError(null);
    setNameSaving(true);
    try {
      await updateMe({ display_name: trimmed });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      setNameError(
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error',
      );
    } finally {
      setNameSaving(false);
    }
  }

  return (
    <div className="space-y-12 max-w-2xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-surface-fg-muted">
          {t('settings.subtitle')}
        </p>
      </header>

      {/* ====================== THEME ====================== */}
      <section
        aria-labelledby="theme-heading"
        className="card space-y-4"
      >
        <div className="flex items-center gap-3">
          <MonitorSmartphone
            className="h-5 w-5 text-primary"
            aria-hidden
          />
          <h2
            id="theme-heading"
            className="text-xl font-semibold"
          >
            {t('settings.theme')}
          </h2>
        </div>

        <p
          id="theme-caption"
          className="text-sm text-surface-fg-muted"
        >
          Dark by default. Gym glare boosts contrast to WCAG AAA for
          high-light environments.
        </p>

        <ThemeToggleGroup
          value={theme}
          onChange={setTheme}
          ariaLabel={t('settings.theme')}
          labels={themeOptionLabels}
          hints={themeOptionHints}
        />

        <ThemeSwatches />

        <p
          className="text-xs text-surface-fg-subtle"
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

      {/* ====================== SUBSCRIPTION ====================== */}
      <SubscriptionSection />

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
            {t('settings.account')}
          </h2>
        </div>

        {user && (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-surface-fg-muted">Email</dt>
              <dd className="font-mono text-xs">{user.email}</dd>
            </div>
          </dl>
        )}

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
              {t('settings.displayNameLabel')}
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
                {t('settings.displayNameHint')}
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
                {t('settings.saved')}
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={nameSaving}>
            {nameSaving ? 'Saving…' : t('common.save')}
          </button>
        </form>

        <DangerZone />

        <button
          type="button"
          onClick={() => {
            signOut();
            // signOut() flips status to anonymous; RequireAuth will redirect
            // to /login on the next render. Force a navigation for clarity.
            window.location.href = '/login';
          }}
          className="btn-ghost inline-flex w-full items-center justify-center gap-2 border border-surface-border"
          data-testid="settings-sign-out"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          {t('auth.logout')}
        </button>
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
            {t('settings.iconOnlyControls')}
          </h2>
        </div>
        <p className="text-sm text-surface-fg-muted">
          {t('settings.iconOnlyControlsHint')}
        </p>
        <div className="flex flex-wrap gap-3">
          <IconOnlyButton
            label={t('settings.switchToLight')}
            icon={<Sun className="h-5 w-5" aria-hidden />}
          />
          <IconOnlyButton
            label={t('settings.switchToDark')}
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