import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Dumbbell, Newspaper, History, Settings, Activity } from 'lucide-react';

import { useT } from '../../lib/i18n';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '../ui/sheet';
import { Button } from '../ui/button';

/**
 * MobileNav — split into two mount points so the Sheet lives with
 * the header chrome while the bottom tab bar anchors to the viewport.
 *
 * Sprint 42 fix (UX #1): the previous Layout hid the primary nav
 * below the `sm` breakpoint (`hidden sm:flex`) which made the entire
 * authed app unreachable for users on phones (the dominant audience
 * for a fitness app).
 *
 * Architecture note: the original implementation rendered both
 * pieces inside <header>. But <header> has `backdrop-filter: blur(...)`
 * which creates a containing block for `position: fixed` descendants.
 * The bottom-tab <nav> with `fixed bottom-0` was anchoring to the
 * TOP of the header (y=1, h=71) instead of the viewport bottom.
 * Splitting into two mount points — hamburger inside the header,
 * bottom tabs outside it — fixes the stacking-context trap.
 *
 * Auth state is NOT changed here; sign-out happens via the existing
 * <SettingsPage> flow which we link to.
 */
const PRIMARY = [
  { to: '/', end: true, label: 'Home', icon: Home, testId: 'mobile-nav-home' },
  { to: '/workout', label: 'Workout', icon: Dumbbell, testId: 'mobile-nav-workout' },
  { to: '/feed', label: 'Feed', icon: Newspaper, testId: 'mobile-nav-feed' },
];

const SECONDARY = [
  { to: '/history', label: 'History', icon: History, testId: 'mobile-nav-history' },
  { to: '/settings', label: 'Settings', icon: Settings, testId: 'mobile-nav-settings' },
  { to: '/insights/tendon', label: 'Insights', icon: Activity, testId: 'mobile-nav-insights' },
];

/**
 * Shared hook — state + navigation closure for the Sheet contents.
 * Kept module-level so both Hamburger and Sheet contents can call it.
 * Not used by the bottom-tab nav (which is a pure NavLink).
 */
function useMobileSheet() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const closeAndNavigate = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  return { open, setOpen, closeAndNavigate };
}

/**
 * Hamburger trigger + Sheet panel. Render this INSIDE the header.
 * The Radix Dialog portal mounts the Sheet to document.body so the
 * `backdrop-filter` on the header doesn't clip it.
 */
export function MobileNavHamburger() {
  const t = useT();
  const { open, setOpen, closeAndNavigate } = useMobileSheet();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nav.openMenu') ?? 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-nav-sheet"
          data-testid="mobile-nav-hamburger"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        id="mobile-nav-sheet"
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b border-surface-border px-5 py-4">
          <SheetTitle className="text-base font-semibold text-surface-fg">
            Calisthenics Tree
          </SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation menu"
              data-testid="mobile-nav-close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <nav
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 px-2 py-3"
          data-testid="mobile-nav-sheet-nav"
        >
          <p
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-surface-fg-subtle"
            id="mobile-nav-section-primary"
          >
            Main
          </p>
          {PRIMARY.map(({ to, label, icon: Icon, testId }) => (
            <button
              key={to}
              type="button"
              onClick={() => closeAndNavigate(to)}
              data-testid={testId}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium text-surface-fg hover:bg-surface-muted"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}

          <hr className="my-2 border-surface-border" />
          <p
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-surface-fg-subtle"
            id="mobile-nav-section-secondary"
          >
            More
          </p>
          {SECONDARY.map(({ to, label, icon: Icon, testId }) => (
            <button
              key={to}
              type="button"
              onClick={() => closeAndNavigate(to)}
              data-testid={testId}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium text-surface-fg hover:bg-surface-muted"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bottom tab bar — render this OUTSIDE the header (at the root of
 * the layout) so `position: fixed` anchors to the viewport, not to
 * the header's backdrop-filter containing block. Hidden at md+
 * since the desktop top nav is visible there.
 */
export function MobileNavBottomTabs() {
  return (
    <nav
      aria-label="Bottom navigation"
      data-testid="mobile-bottom-tabs"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{
        backgroundColor: 'var(--color-glass)',
        backdropFilter: 'blur(var(--blur-md)) saturate(180%)',
        WebkitBackdropFilter: 'blur(var(--blur-md)) saturate(180%)',
      }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 py-2">
        {PRIMARY.map(({ to, end, label, icon: Icon, testId }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              data-testid={testId.replace('mobile-nav-', 'bottom-tab-')}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-surface-fg-muted hover:bg-surface-muted hover:text-surface-fg'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Default export — convenience wrapper that renders both halves.
 * Layout.tsx imports the named exports separately to put them in
 * the right DOM slots (hamburger inside header, bottom tabs outside).
 */
export default function MobileNav() {
  return (
    <>
      <MobileNavHamburger />
      <MobileNavBottomTabs />
    </>
  );
}