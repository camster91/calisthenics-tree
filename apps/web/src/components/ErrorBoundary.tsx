/**
 * ErrorBoundary — top-level React error boundary.
 *
 * Sprint 37 audit fix (RED-2): any render throw anywhere in the app previously
 * surfaced as a blank white screen with no telemetry. This component:
 *   1. Catches render-phase errors via getDerivedStateFromError
 *   2. Reports to Sentry via the optional Sentry hook (silently no-ops if not
 *      configured; we don't add a Sentry runtime dep on web to keep the bundle
 *      lean — errors get POSTed to /api/v1/telemetry/client-error instead)
 *   3. Reports to PostHog as a captured event with stack trace
 *   4. Renders a friendly fallback with a "Reload" action
 *
 * The component itself is a class component (React 19 still requires class
 * components for error boundaries — no hooks equivalent yet).
 */
import * as React from 'react';
import { captureException } from '../lib/analytics';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional UI override; falls back to the built-in friendly fallback. */
  fallback?: (err: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Fire-and-forget telemetry. captureException should never throw — wrap in
    // try/catch defensively because if telemetry breaks the whole app we
    // definitely don't want that.
    try {
      captureException(error, {
        componentStack: info.componentStack ?? undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    } catch {
      // swallow — never let telemetry break the fallback UI
    }
    // Also log to the browser console so devs see it locally.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught render error', error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-5 py-8 text-center"
        data-testid="error-boundary"
      >
        <span
          aria-hidden
          className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 text-danger"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <div className="space-y-2">
          <p className="display-eyebrow text-danger">Something broke</p>
          <h1 className="text-balance text-3xl font-bold leading-heading tracking-tighter">
            We hit an unexpected error.
          </h1>
          <p className="text-base leading-body text-surface-fg-muted">
            We've been notified. You can reload to try again, or head back to the
            home screen.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={this.reset}
            data-testid="error-boundary-reset"
          >
            Try again
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href="/">Back to home</a>
          </Button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;