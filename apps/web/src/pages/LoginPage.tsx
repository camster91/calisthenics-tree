/**
 * LoginPage — `/login` route.
 *
 * Phase 2 — magic-link auth. No passwords. The user enters an email,
 * we POST /auth/magic-link, and (in production) they receive an email
 * with a sign-in link. In dev mode (POSTMARK_TOKEN unset), the API
 * returns the token inline and we render it as a clickable URL so the
 * dev doesn't have to leave the browser.
 *
 * Also offers a "Continue without account" path — local-only mode where
 * data lives in localStorage and never hits the backend. Useful when
 * email isn't wired up.
 *
 * After the link is clicked, AuthVerifyPage handles the redirect.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Laptop } from 'lucide-react';

import { useAuth } from '../lib/auth';
import { apiErrorToMessage } from '../lib/api';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export default function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { signIn, signInLocal, status: authStatus } = useAuth();

  // Already signed in? Don't show the login form — bounce to home.
  // (Covers the "clicked an old email link while already logged in" case.)
  useEffect(() => {
    if (authStatus === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [authStatus, navigate]);

  // Vite dev server proxies `/` to the SPA's index, so an anonymous visitor
  // who hits / gets redirected to /login (RequireAuth). Show a quick "go to
  // the marketing page" link so they can see the product without auth.

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Dev-only: when the API returns dev_token (because POSTMARK_TOKEN is unset
  // locally), we expose the link inline so the dev can click it.
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!email || status === 'submitting') return;

      setStatus('submitting');
      setErrorMsg(null);
      setDevLink(null);

      try {
        const response = await signIn(email);
        setStatus('sent');

        // Dev-only affordance: when POSTMARK_TOKEN is unset, the API returns
        // the magic-link token directly. Build the same URL the email would
        // contain so the dev can click through without checking logs.
        if (response.status === 'dev' && response.dev_token) {
          // The API constructs the link from settings.web_base_url. Mirror
          // that here for the dev path.
          const base = window.location.origin;
          setDevLink(`${base}/auth/verify?token=${encodeURIComponent(response.dev_token)}`);
        }
      } catch (err) {
        // Sprint 42 fix (UX #5): user-facing message via the centralised
        // apiErrorToMessage helper instead of raw `${status} ${detail}`.
        setErrorMsg(apiErrorToMessage(err));
        setStatus('error');
      }
    },
    [email, signIn, status],
  );

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-8"
    >
      <header className="flex flex-col items-center space-y-3 text-center">
        <Link
          to="/welcome"
          className="mb-4 inline-flex flex-col items-center gap-3 rounded-md"
          aria-label="Calisthenics Tree, product overview"
        >
          <img
            src="/brand/logo.svg"
            width={64}
            height={64}
            alt=""
            className="h-16 w-16"
          />
          <span className="font-display text-2xl font-heavy leading-none tracking-display [font-stretch:80%]">
            Calisthenics Tree
          </span>
        </Link>
        <h1 className="display-section text-balance text-4xl">
          {t('auth.login')}
        </h1>
        <p className="text-base leading-body text-surface-fg-muted">
          {t('auth.loginSubtitle')}
        </p>
        <Link
          to="/welcome"
          className="inline-block pt-1 text-xs font-medium text-surface-fg-muted transition-colors hover:text-surface-fg"
        >
          ← Back to the product overview
        </Link>
      </header>

      {status === 'sent' ? (
        <section
          className="card space-y-4"
          aria-live="polite"
          data-testid="login-sent"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden
              className="h-5 w-5 shrink-0 text-success"
            />
            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                {t('auth.magicLinkSent')}
              </h2>
              <p className="text-sm text-surface-fg-muted">
                {t('auth.magicLinkSentBody', { email })}
              </p>
            </div>
          </div>

          {devLink && (
            <div
              className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm"
              data-testid="login-dev-link"
              role="note"
            >
              <p className="mb-1 font-semibold text-warning">
                {t('auth.devModeBanner')}
              </p>
              <p className="mb-2 text-xs text-surface-fg-muted">
                {t('auth.devModeHelp')}
              </p>
              <a
                href={devLink}
                className="inline-flex items-center gap-1 break-all text-primary underline"
                data-testid="login-dev-link-url"
              >
                {devLink} <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setEmail('');
              setDevLink(null);
            }}
            className="btn-ghost w-full text-sm"
          >
            {t('auth.useDifferentEmail')}
          </button>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="card space-y-4"
          aria-describedby={errorMsg ? 'login-error' : undefined}
        >
          {status === 'error' && errorMsg && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
              data-testid="login-error"
            >
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">{t('auth.magicLinkError')}</p>
                <p className="text-xs opacity-80">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.emailLabel')}</Label>
            <div className="relative">
              <Mail
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-fg-subtle"
              />
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'submitting'}
                invalid={status === 'error'}
                className="pl-10"
                data-testid="login-email-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={status === 'submitting' || !email}
            data-testid="login-submit"
          >
            {status === 'submitting' ? t('auth.sending') : t('auth.sendMagicLink')}
          </Button>

          <p className="text-center text-xs text-surface-fg-subtle">
            {t('auth.firstTime')}{' '}
            <Link to="/onboarding/q1" className="text-primary underline">
              {t('auth.startHere')}
            </Link>
          </p>

          {/* Divider + local-mode escape hatch. */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-2 text-xs uppercase tracking-wider text-surface-fg-subtle">
                or
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => {
              signInLocal();
              navigate('/onboarding/q1', { replace: true });
            }}
            data-testid="login-skip"
          >
            <Laptop aria-hidden className="h-4 w-4" />
            Continue without account
          </Button>

          <p className="text-center text-[10px] leading-snug text-surface-fg-subtle">
            Data saves on this device only. No email, no server.
          </p>
        </form>
      )}
    </main>
  );
}