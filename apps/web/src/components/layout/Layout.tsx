import { Outlet, NavLink } from 'react-router-dom';
import { useT } from '../../lib/i18n';

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

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-sticky border-b border-surface-border"
        style={{
          backgroundColor: 'var(--color-glass)',
          backdropFilter: 'blur(var(--blur-md)) saturate(180%)',
          WebkitBackdropFilter: 'blur(var(--blur-md)) saturate(180%)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
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

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-5 py-8"
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
