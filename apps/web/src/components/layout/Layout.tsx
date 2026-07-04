import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useT } from '../../lib/i18n';
import { useState } from 'react';

import OfflineBanner from './OfflineBanner';
import MobileNavBottomTabs, { MobileNavHamburger } from './MobileNav';

/**
 * Layout — shared chrome (header + main + footer).
 *
 * Header has theme toggle (default ⇄ gym-glare). Tabs nav is for the
 * authenticated app shell (DAG browse / workout / feed / settings).
 * Onboarding & marketing screens override this with their own layout.
 *
 * Sprint 37 (Apple Fitness+ direction):
 * - Header is now a true glass surface (--color-glass + backdrop-blur)
 * - Brand mark uses squircle radius and the new wider glow
 * - Nav links use the new ghost button with spring press feedback
 * - Hairline border bottom (iOS separator style)
 *
 * Nav labels are translated via useT() per PLAN.md Gap 3. The dev-only
 * "Showcase" and "Wireframes" links stay in English (developer surface,
 * not user-facing).
 */
export default function Layout() {
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-sticky border-b border-surface-border pt-[env(safe-area-inset-top)]"
        style={{
          backgroundColor: 'var(--color-glass)',
          backdropFilter: 'blur(var(--blur-md)) saturate(180%)',
          WebkitBackdropFilter: 'blur(var(--blur-md)) saturate(180%)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <a href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-block h-9 w-9 rounded-xl bg-primary"
              style={{ boxShadow: 'var(--shadow-glow)' }}
            />
            <span className="text-base font-bold tracking-tighter text-surface-fg">
              Calisthenics Tree
            </span>
          </a>
          {/* Sprint 42 fix (UX #1): hamburger trigger for mobile users.
              Only the trigger renders inside the header — the Sheet
              portal + bottom tabs come from <MobileNav />'s SECOND
              call site below the </main>. Splitting them keeps the
              bottom tabs OUTSIDE the header's backdrop-filter
              containing block — `position: fixed` would otherwise
              anchor to the header's top instead of the viewport. */}
          <MobileNavHamburger />

          {/* Header search — compact input + Enter to /search?q=...
              Lives in the chrome so users in any authed route can
              pivot to discovery without leaving their context. */}
          <form
            role="search"
            className="hidden flex-1 max-w-xs sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.trim();
              if (v.length > 0) {
                navigate(`/search?q=${encodeURIComponent(v)}`);
              }
            }}
            data-testid="header-search"
          >
            <label htmlFor="header-search-input" className="sr-only">
              Search
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-surface-fg-muted"
              >
                {/* magnifier icon, inline SVG so we don't pull a 3rd-party icon lib */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                id="header-search-input"
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 w-full rounded-md border border-surface-border bg-surface pl-8 pr-3 text-sm focus:border-primary focus:outline-none"
                data-testid="header-search-input"
              />
            </div>
          </form>
          <nav aria-label="Primary" className="hidden gap-1 sm:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              {t('nav.home')}
            </NavLink>
            <NavLink
              to="/workout"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              {t('nav.workout')}
            </NavLink>
            <NavLink
              to="/feed"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              {t('nav.feed')}
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              {t('nav.settings')}
            </NavLink>
            <NavLink
              to="/insights/tendon"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-surface-fg'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              {t('nav.insights')}
            </NavLink>
            <NavLink
              to="/components"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-primary'
                    : 'text-primary/70 hover:bg-surface-muted hover:text-primary'
                }`
              }
              title="T35 component showcase"
            >
              Showcase
            </NavLink>
            <NavLink
              to="/wireframes"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-primary'
                    : 'text-primary/70 hover:bg-surface-muted hover:text-primary'
                }`
              }
              title="T37 wireframe review surface"
            >
              Wireframes
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Sprint 42 fix (UX #4): offline banner sits just below the
          header so it appears above the page content without pushing
          the layout down (it conditionally renders nothing when online). */}
      <OfflineBanner />

      {/* Sprint 42 fix (UX #1): the bottom-tab nav renders here, OUTSIDE
          the header's backdrop-filter containing block. If it were
          inside the header (above the </main>), `position: fixed`
          would anchor to the header's top instead of the viewport
          bottom. The Sheet is also rendered here so its portal
          mounts to body without filter-induced clipping. */}
      <MobileNavBottomTabs />

      <main
        id="main"
        // Sprint 42 fix (UX #1): on mobile, pad the bottom so the
        // fixed bottom tab bar doesn't overlap the page content.
        // `pb-20` = 5rem ≈ tab bar (~3rem) + safe area (~2rem).
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 pb-20 md:pb-8"
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <footer className="border-t border-surface-border px-5 py-6 text-center text-xs text-surface-fg-subtle">
        <p>Calisthenics Tree — train smarter, not just harder.</p>
      </footer>
    </div>
  );
}
