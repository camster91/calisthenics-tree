/** SearchPage — /search?q=...

Server-backed via GET /api/v1/search. Three result groups: nodes,
exercises, users. Renders a debounced input so typing feels snappy
without hammering the api on every keystroke.

Empty state ("type to search...") before any query; "no results"
empty state for queries that don't match anything. Anonymous users
see nodes + exercises only; authed users also see the users group
(api gates it on cookie presence).

The page is a sibling of the marketing routes (not under the
authed Layout) so a logged-out user can still search the public
catalog — that's the SEO-friendly behavior.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { search, type SearchResultItem, type SearchKind } from '../lib/api';

const KIND_LABELS: Record<SearchKind, string> = {
  node: 'Skills',
  exercise: 'Exercises',
  user: 'People',
};

/** Time (ms) between the user stopping typing and the api call.
 * 300ms is the sweet spot for "feels instant" without over-fetching
 * on every keystroke. */
const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<{
    nodes: SearchResultItem[];
    exercises: SearchResultItem[];
    users: SearchResultItem[];
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  // Sync local input <-> URL ?q= so the page is shareable / reloadable.
  useEffect(() => {
    if (query !== initialQ) setParams(query ? { q: query } : {}, { replace: true });
  }, [query, initialQ, setParams]);

  // Debounced fetch. Re-fires on query change. The api handles 1-64
  // char validation server-side; we guard client-side too.
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults(null);
      setStatus('idle');
      return;
    }
    if (q.length > 64) return; // api will 422 anyway
    let cancelled = false;
    setStatus('loading');
    setError(null);
    const t = setTimeout(() => {
      search(q, 5)
        .then((r) => {
          if (cancelled) return;
          setResults({
            nodes: r.nodes,
            exercises: r.exercises,
            users: r.users,
          });
          setStatus('ready');
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Search failed');
          setStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const renderGroup = (
    kind: SearchKind,
    items: SearchResultItem[],
  ): React.ReactNode => {
    if (items.length === 0) return null;
    return (
      <section
        key={kind}
        className="space-y-3"
        aria-labelledby={`search-group-${kind}`}
      >
        <h2
          id={`search-group-${kind}`}
          className="display-eyebrow"
        >
          {KIND_LABELS[kind]}
        </h2>
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              data-testid={`search-result-${kind}`}
            >
              <ResultCard item={r} />
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const showEmptyReady =
    status === 'ready' &&
    results !== null &&
    results.nodes.length === 0 &&
    results.exercises.length === 0 &&
    results.users.length === 0;

  return (
    <main
      id="main"
      className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-12"
      data-testid="search-page"
    >
      <header className="space-y-3">
        <p className="display-eyebrow">Search</p>
        <h1 className="text-4xl font-bold leading-heading tracking-tighter sm:text-5xl">
          Find a skill, exercise, or person
        </h1>
        <p className="text-base leading-body text-surface-fg-muted">
          Type to search the catalog. Skills and exercises are public; people results appear when you&apos;re signed in.
        </p>
      </header>

      <form
        className="space-y-2"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="search-input" className="sr-only">
          Search query
        </label>
        <input
          id="search-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoFocus
          placeholder="e.g. push, handstand, lever..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="search-input"
          className="h-12 w-full rounded-md border border-surface-border bg-surface px-4 text-base focus:border-primary focus:outline-none"
        />
        {status === 'loading' && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-surface-fg-muted"
          >
            Searching…
          </p>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {status === 'idle' && (
        <p className="text-sm text-surface-fg-muted">
          Start typing to search.
        </p>
      )}

      {showEmptyReady && (
        <p className="text-sm text-surface-fg-muted" data-testid="search-empty">
          No matches for &ldquo;{query}&rdquo;.
        </p>
      )}

      {status === 'ready' && results && (
        <div className="space-y-8">
          {renderGroup('node', results.nodes)}
          {renderGroup('exercise', results.exercises)}
          {renderGroup('user', results.users)}
        </div>
      )}
    </main>
  );
}

function ResultCard({ item }: { item: SearchResultItem }) {
  // Build a sensible click target. Nodes land on the SEO learning
  // page; exercises also link to the learning page for now (no
  // dedicated exercise detail yet); users go to /u/:id.
  const href =
    item.kind === 'node'
      ? `/learn/${nodeIdToSlug(item.id, item.name)}`
      : item.kind === 'exercise'
        ? `/learn/${nodeIdToSlug(item.id, item.name)}`
        : `/u/${item.id.replace(/^usr_/, '')}`;

  return (
    <Link
      to={href}
      className="card flex items-center justify-between gap-3 transition-colors hover:border-primary/50"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-base font-semibold text-surface-fg">
          {item.name}
        </p>
        <p className="text-xs text-surface-fg-muted">{item.breadcrumb}</p>
      </div>
      <span className="text-xs uppercase tracking-wide text-surface-fg-subtle">
        {KIND_LABELS[item.kind]}
      </span>
    </Link>
  );
}

/** Best-effort slug: search returns node_<uuid> for the id. The
 * learning page uses {tree_slug}-r{rank}-{name-slug}. Without the
 * tree slug we can't reconstruct — fall back to the home page so
 * the click never dead-ends. */
function nodeIdToSlug(id: string, _name: string): string {
  // Strip the "node_" prefix and the trailing UUID; the search
  // response doesn't include the tree slug, so we link to /learn/<id>
  // which currently 404s but is at least a stable URL we can improve
  // later by adding the slug to the response.
  if (id.startsWith('node_')) {
    // Fall back to home — clicking a node from search today is a
    // graceful "no detailed landing page yet" rather than a 404.
    return '';
  }
  return id;
}