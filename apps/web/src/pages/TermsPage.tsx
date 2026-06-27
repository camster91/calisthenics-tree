/**
 * TermsPage — /terms
 *
 * Stub for the marketing surface. Real copy generated via termsfeed.com
 * per PLAN.md Gap 6, reviewed before launch.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main
      id="main"
      className="prose prose-invert mx-auto max-w-2xl px-4 py-12"
      data-testid="terms-page"
    >
      <Link
        to="/welcome"
        className="inline-flex items-center gap-1 text-xs text-surface-fg-muted hover:text-surface-fg"
      >
        <ArrowLeft aria-hidden className="h-3 w-3" />
        Back
      </Link>
      <h1>Terms of service</h1>
      <p className="text-surface-fg-muted">
        Last updated 2026-06-25. Working draft — full terms will be
        generated via termsfeed.com and reviewed before public launch
        (PLAN.md Gap 6).
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Calisthenics Tree is a wellness and education app, not medical advice.</li>
        <li>
          Consult a qualified coach or physiotherapist before starting any
          new training program. Stop if anything hurts.
        </li>
        <li>
          We don't guarantee specific results. Progression depends on
          consistency, recovery, and individual factors outside the app's
          control.
        </li>
        <li>
          We reserve the right to change features, pricing, and these
          terms with reasonable notice.
        </li>
      </ul>

      <h2>Subscriptions (P5)</h2>
      <p>
        When subscriptions launch: $5.99/mo, $29.99/yr, $99 lifetime, with a
        7-day trial on monthly and annual. Cancel anytime; we don't
        auto-renew without a clear confirmation.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>One account per person.</li>
        <li>Don't try to break the app, scrape data, or resell our service.</li>
        <li>Don't post content you don't have the rights to.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions:{' '}
        <a href="mailto:hello@workout.ashbi.ca" className="text-primary underline">
          hello@workout.ashbi.ca
        </a>
      </p>
    </main>
  );
}