import { Outlet, NavLink } from 'react-router-dom';
import { useT } from '../../lib/i18n';

/**
 * Layout — shared chrome (header + main + footer).
 *
 * Header has theme toggle (default ⇄ gym-glare). Tabs nav is for the
 * authenticated app shell (DAG browse / workout / feed / settings).
 * Onboarding & marketing screens override this with their own layout.
 *
 * Nav labels are translated via useT() per PLAN.md Gap 3. The dev-only
 * "Showcase" and "Wireframes" links stay in English (developer surface,
 * not user-facing).
 */
export default function Layout() {
  const t = useT();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-sticky border-b border-surface-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-8 w-8 rounded-md bg-primary shadow-glow"
            />
            <span className="text-base font-semibold tracking-tight">
              Calisthenics Tree
            </span>
          </a>
          <nav aria-label="Primary" className="hidden gap-1 sm:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              {t('nav.home')}
            </NavLink>
            <NavLink
              to="/workout"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              {t('nav.workout')}
            </NavLink>
            <NavLink
              to="/feed"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              {t('nav.feed')}
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              {t('nav.settings')}
            </NavLink>
            <NavLink
              to="/insights/tendon"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''}`
              }
            >
              {t('nav.insights')}
            </NavLink>
            <NavLink
              to="/components"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''} text-primary`
              }
              title="T35 component showcase"
            >
              Showcase
            </NavLink>
            <NavLink
              to="/wireframes"
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-surface-muted' : ''} text-primary`
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
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8"
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <footer className="border-t border-surface-border px-4 py-6 text-center text-xs text-surface-fg-subtle">
        <p>Calisthenics Tree — train smarter, not just harder.</p>
      </footer>
    </div>
  );
}
