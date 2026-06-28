import posthog from 'posthog-js';

/**
 * PostHog analytics — initialized once at app boot.
 *
 * Per PLAN.md Gap 4: PostHog Cloud (free 1M events/mo). Self-host deferred
 * until 5M+ events/mo. Wired in Phase 2.
 *
 * No-ops when VITE_POSTHOG_API_KEY is unset (dev / preview envs).
 */

const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';
let initialized = false;

export function initAnalytics() {
  if (initialized || !apiKey) return;
  posthog.init(apiKey, {
    api_host: host,
    capture_pageview: false, // we capture manually via router listener
    capture_pageleave: true,
    // Disable session recording in dev to keep noise out of the dashboard
    disable_session_recording: import.meta.env.DEV,
  });
  initialized = true;
}

export function capturePageview(path: string) {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: window.location.origin + path });
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function reset() {
  if (!initialized) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, props);
}

/**
 * Capture a client-side exception. Used by ErrorBoundary so a render throw
 * anywhere in the app surfaces in PostHog (and can be wired to Sentry later
 * when SENTRY_DSN is set on the web build).
 *
 * No-op when PostHog is not initialized (dev / unconfigured prod).
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  const err = error instanceof Error ? error : new Error(String(error));
  // PostHog captures exceptions via captureException; falls back to a regular
  // event with a stack field if not available in this posthog-js version.
  const props = {
    ...context,
    name: err.name,
    message: err.message,
    stack: err.stack ?? '',
  };
  if (typeof posthog.captureException === 'function') {
    posthog.captureException(err, props);
  } else {
    posthog.capture('$client_error', props);
  }
}