/**
 * AuthVerifyPage — `/auth/verify?token=...` route.
 *
 * Handles the magic-link click. On mount:
 *   1. Reads `token` from the URL query string
 *   2. Calls verifyMagicLink(token) → stores JWT pair
 *   3. On success: redirects to the `next` query param (default `/`)
 *   4. On failure: shows an error + "Try again" link to /login
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function AuthVerifyPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyMagicLink, status: authStatus } = useAuth();

  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ranRef = useRef(false);

  const token = searchParams.get('token');
  // Priority: explicit ?next= > sessionStorage 'ct:auth:next' (set by
  // RequireAuth when redirecting to /login) > '/' default.
  const urlNext = searchParams.get('next');
  const storedNext =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return sessionStorage.getItem('ct:auth:next');
          } catch {
            return null;
          }
        })()
      : null;
  const next = urlNext ?? storedNext ?? '/';

  useEffect(() => {
    // StrictMode-safe: only run once even if the effect re-fires in dev.
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus('error');
      setErrorMsg(t('auth.verifyMissingToken'));
      return;
    }

    verifyMagicLink(token)
      .then(() => {
        setStatus('success');
        // Clear the stored next so it doesn't bleed into the next session.
        try {
          sessionStorage.removeItem('ct:auth:next');
        } catch {
          // ignore — sessionStorage may be blocked
        }
        // Brief flash so the user sees the success state, then navigate.
        // 600ms feels fast enough not to be annoying but visible enough to
        // register on slow connections.
        setTimeout(() => navigate(next, { replace: true }), 600);
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? err.status === 400
              ? t('auth.verifyInvalidToken')
              : `${err.status} ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [token, next, navigate, verifyMagicLink, t]);

  // If we're already authed (e.g. user opened this link in a tab that's
  // already logged in), bounce them on immediately.
  useEffect(() => {
    if (authStatus === 'authenticated' && status === 'verifying') {
      navigate(next, { replace: true });
    }
  }, [authStatus, status, next, navigate]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-5 py-8"
    >
      <header className="space-y-3 text-center">
        <p className="display-eyebrow">Sign in</p>
        <h1 className="text-balance text-4xl font-bold leading-heading tracking-tighter">
          {t('auth.verifying')}
        </h1>
      </header>

      <section className="card space-y-4" aria-live="polite">
        {status === 'verifying' && (
          <div
            className="flex items-center gap-3 text-sm"
            data-testid="verify-loading"
          >
            <Loader2
              aria-hidden
              className="h-5 w-5 animate-spin text-primary"
            />
            <p>{t('auth.verifyingBody')}</p>
          </div>
        )}

        {status === 'success' && (
          <div
            className="flex items-center gap-3 text-sm"
            data-testid="verify-success"
          >
            <CheckCircle2
              aria-hidden
              className="h-5 w-5 shrink-0 text-success"
            />
            <p>{t('auth.verifySuccess')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
              role="alert"
              data-testid="verify-error"
            >
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">{t('auth.verifyError')}</p>
                {errorMsg && (
                  <p className="text-xs opacity-80">{errorMsg}</p>
                )}
              </div>
            </div>
            <Button
              asChild
              variant="default"
              size="lg"
              className="w-full"
              data-testid="verify-retry"
            >
              <Link to="/login">{t('auth.tryAgain')}</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}