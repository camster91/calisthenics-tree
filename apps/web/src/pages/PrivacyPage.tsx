/**
 * PrivacyPage — /privacy
 *
 * Stub for the marketing surface. Real copy lives in DECISION.md + the
 * /api/v1/users/me/export + DELETE endpoints (D19). This page is the
 * public-facing summary; the full policy gets reviewed by Cameron
 * before public launch per PLAN.md Gap 6.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main
      id="main"
      className="prose prose-invert mx-auto max-w-2xl px-4 py-12"
      data-testid="privacy-page"
    >
      <Link
        to="/welcome"
        className="inline-flex items-center gap-1 text-xs text-surface-fg-muted hover:text-surface-fg"
      >
        <ArrowLeft aria-hidden className="h-3 w-3" />
        Back
      </Link>
      <h1>Privacy policy</h1>
      <p className="text-surface-fg-muted">
        Last updated 2026-06-25. This is a working draft — the launch-ready
        policy will be reviewed before public beta.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Email address</strong> — used for sign-in via magic link.
          We don't sell, share, or use it for marketing.
        </li>
        <li>
          <strong>Workout data</strong> — sets, reps, hold seconds, the
          node you trained on, the timestamp. Used to compute your
          position on the skill tree and your strain history.
        </li>
        <li>
          <strong>Aggregated analytics</strong> — page views, button clicks.
          No third-party trackers. PostHog Cloud with EU/US hosting.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>No ads.</li>
        <li>No selling or sharing of your data with third parties.</li>
        <li>
          No computer-vision form analysis. We don't upload your videos
          anywhere; the only video URLs we store are the ones you visit
          from the in-app player (YouTube embeds).
        </li>
      </ul>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Export</strong>: hit{' '}
          <code className="rounded bg-surface px-1 font-mono text-xs">
            POST /api/v1/users/me/export
          </code>{' '}
          to get a JSON dump of your account. (Coming in P5.)
        </li>
        <li>
          <strong>Delete</strong>: hit{' '}
          <code className="rounded bg-surface px-1 font-mono text-xs">
            DELETE /api/v1/users/me
          </code>{' '}
          to wipe your account and all workout history. Immediate, no
          grace period. (Coming in P5.)
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions:{' '}
        <a href="mailto:hello@calisthenics-tree.com" className="text-primary underline">
          hello@calisthenics-tree.com
        </a>
      </p>
    </main>
  );
}