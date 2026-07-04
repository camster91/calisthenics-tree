/**
 * NotFoundPage — public 404 catch-all
 *
 * Sprint 42 fix (UX #3): the public routes block had no catch-all, so
 * typing /foo or any unknown URL served index.html but Router did
 * nothing — blank white screen. This page replaces that with a real
 * 404 surface, with deep-links to the 4 trees + search so users
 * recover instead of bouncing.
 *
 * Mounted as the LAST Route inside the public routes block (after
 * /welcome + /privacy + /terms + /search + /share + /learn). The
 * authed block has its own catch-all (`<HomePage />` for authed +
 * onboarded users); this only covers public-side typos.
 */
import { Link, useLocation } from 'react-router-dom';
import { Compass, Search, Home as HomeIcon } from 'lucide-react';

import { Button } from '../components/ui/button';

const TREES = [
  { slug: 'push', label: 'Push', emoji: '🤸' },
  { slug: 'pull', label: 'Pull', emoji: '💪' },
  { slug: 'core', label: 'Core', emoji: '🧱' },
  { slug: 'legs', label: 'Legs', emoji: '🦵' },
];

export default function NotFoundPage() {
  // Use the requested path in the body copy so the user knows which
  // URL we couldn't find. Falls back to a generic message if the
  // router hasn't populated `pathname` yet (shouldn't happen in
  // practice but the fallback keeps the page renderable).
  const location = useLocation();
  const requested = location.pathname || '/(unknown)';

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-12 sm:py-20">
      <header className="mb-8 flex items-center gap-3">
        <Compass className="h-7 w-7 text-warning" aria-hidden="true" />
        <h1 className="text-3xl font-bold tracking-tight text-surface-fg sm:text-4xl">
          Page not found
        </h1>
      </header>

      <p className="mb-2 text-lg leading-body text-surface-fg-muted">
        We don&rsquo;t have a <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">{requested}</code>.
      </p>
      <p className="mb-10 text-base leading-body text-surface-fg-muted">
        Maybe a typo, maybe an old link. Try one of the four skill trees below,
        or jump back to home.
      </p>

      <section aria-labelledby="tree-cta-heading" className="mb-10">
        <h2
          id="tree-cta-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-wide text-surface-fg-subtle"
        >
          Browse a tree
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TREES.map((t) => (
            <Link
              key={t.slug}
              to={`/tree/${t.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-1 px-4 py-4 transition hover:border-warning hover:bg-surface-2"
            >
              <span className="text-2xl" aria-hidden="true">
                {t.emoji}
              </span>
              <span className="text-base font-semibold text-surface-fg group-hover:text-warning">
                {t.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="default">
          <Link to="/" className="flex items-center gap-2">
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/search" className="flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Link>
        </Button>
      </div>

      <footer className="mt-auto pt-12 text-xs text-surface-fg-subtle">
        Lost? The URL bar is editable — try <Link to="/welcome" className="underline">/welcome</Link>,{' '}
        <Link to="/login" className="underline">/login</Link>, or{' '}
        <Link to="/search" className="underline">/search</Link>.
      </footer>
    </div>
  );
}