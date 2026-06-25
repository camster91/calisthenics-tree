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