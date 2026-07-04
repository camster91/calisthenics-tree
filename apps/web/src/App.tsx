import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTheme } from './lib/theme';
import { capturePageview } from './lib/analytics';

// Sprint 38 hardening RED-9: lazy-load wireframes + marketing routes.
// These are dev-only surfaces (gated by Layout visibility behind ?dev=1)
// and App Store screenshot renders — neither is on the hot path. Each
// becomes its own chunk that's fetched only when the user navigates there.
const Screenshots = lazy(() => import('./pages/marketing/Screenshots'));
const OnboardingDemo = lazy(() => import('./pages/marketing/OnboardingDemo'));
const WireframesIndex = lazy(() => import('./pages/wireframes/index'));
const LandingWireframe = lazy(() => import('./pages/wireframes/LandingWireframe'));
const LoginWireframe = lazy(() => import('./pages/wireframes/LoginWireframe'));
const OnboardingQ1Wireframe = lazy(() => import('./pages/wireframes/OnboardingQ1Wireframe'));
const OnboardingQ2Wireframe = lazy(() => import('./pages/wireframes/OnboardingQ2Wireframe'));
const OnboardingQ3Wireframe = lazy(() => import('./pages/wireframes/OnboardingQ3Wireframe'));
const OnboardingTestWireframe = lazy(() => import('./pages/wireframes/OnboardingTestWireframe'));
const OnboardingResultWireframe = lazy(() => import('./pages/wireframes/OnboardingResultWireframe'));
const HomeWireframe = lazy(() => import('./pages/wireframes/HomeWireframe'));
const WorkoutLogWireframe = lazy(() => import('./pages/wireframes/WorkoutLogWireframe'));
const WorkoutDoneWireframe = lazy(() => import('./pages/wireframes/WorkoutDoneWireframe'));
const FeedWireframe = lazy(() => import('./pages/wireframes/FeedWireframe'));
const FriendProfileWireframe = lazy(() => import('./pages/wireframes/FriendProfileWireframe'));
const TendonInsightWireframe = lazy(() => import('./pages/wireframes/TendonInsightWireframe'));
const SettingsWireframe = lazy(() => import('./pages/wireframes/SettingsWireframe'));
const PaywallWireframe = lazy(() => import('./pages/wireframes/PaywallWireframe'));
const SubscriptionWireframe = lazy(() => import('./pages/wireframes/SubscriptionWireframe'));
const EmptyStatesWireframe = lazy(() => import('./pages/wireframes/EmptyStatesWireframe'));
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import ComponentsPage from './pages/ComponentsPage';
import ShareRenderPage from './pages/ShareRenderPage';
import WorkoutLogPage from './pages/WorkoutLogPage';
import WorkoutDonePage from './pages/WorkoutDonePage';
import TreePage from './pages/TreePage';
import InsightsPage from './pages/InsightsPage';
import LoginPage from './pages/LoginPage';
import AuthVerifyPage from './pages/AuthVerifyPage';
import OnboardingQ1Page from './pages/OnboardingQ1Page';
import OnboardingQ2Page from './pages/OnboardingQ2Page';
import OnboardingTestPage from './pages/OnboardingTestPage';
import OnboardingResultPage from './pages/OnboardingResultPage';
import LandingPage from './pages/LandingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NodeLandingPage from './pages/NodeLandingPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import NotFoundPage from './pages/NotFoundPage';
import SearchPage from './pages/SearchPage';
import Layout from './components/layout/Layout';
import { RequireAuth } from './components/RequireAuth';
import { RequireOnboarded } from './components/RequireOnboarded';

// Wireframe review surface — T37 deliverable. Not wired into production
// navigation; the `/wireframes/*` namespace is gated by Layout visibility

/**
 * App root — router + theme bootstrap.
 *
 * Phase 1.5 children (T34-T40) add production routes. T37 wires the
 * /wireframes/* review surface so the design team can iterate without
 * standing up real backend integration.
 */
export default function App() {
  useTheme();
  const location = useLocation();

  // Phase 2 — PLAN.md Gap 4. Manual pageview capture (PostHog's auto
  // pageview fires before the router resolves on initial load). No-op when
  // PostHog isn't initialized.
  useEffect(() => {
    capturePageview(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Routes>
        {/* T40 — App Store Connect screenshot production. Stand-alone
            1290x2796 renders, NO Layout chrome (no nav, footer, or theme
            toggle). Routed at the root so Layout is bypassed. Hit by
            Playwright script (scripts/render-marketing.ts) for PNG export.
            Sprint 38: lazy-loaded — only fetched when this URL is hit. */}
        <Route
          path="marketing/screenshots"
          element={
            <Suspense fallback={null}>
              <Screenshots />
            </Suspense>
          }
        />
        <Route
          path="marketing/screenshots/:slot"
          element={
            <Suspense fallback={null}>
              <Screenshots />
            </Suspense>
          }
        />

        {/* T40 — App Store Connect preview video frames. Same model as the
            static screenshots — 1290x2796 stand-alone renders, no Layout,
            hit by scripts/render-onboarding-video.ts which encodes a
            15-30s mp4 via ffmpeg. Sprint 38: lazy-loaded. */}
        <Route
          path="marketing/onboarding"
          element={
            <Suspense fallback={null}>
              <OnboardingDemo />
            </Suspense>
          }
        />
        <Route
          path="marketing/onboarding/:step"
          element={
            <Suspense fallback={null}>
              <OnboardingDemo />
            </Suspense>
          }
        />

        {/* Auth — public routes, no Layout chrome (no nav while not signed in) */}
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/verify" element={<AuthVerifyPage />} />

        {/* Marketing + legal — public, no chrome. /welcome is the public
            landing for new visitors. */}
        <Route path="welcome" element={<LandingPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        {/* Search — public, no chrome. Lives at root so signed-out
            users can search the public catalog. */}
        <Route path="search" element={<SearchPage />} />

        {/* T39 — public share-card render. Social-media bots (Slack,
            Twitter, iMessage) crawl these without auth; the FastAPI
            `/api/v1/share/<id>.png` route is the eventual home for
            this but the static SPA route is the production contract
            until then. Mounted outside Layout so the screenshot is
            clean (no nav/footer). */}
        <Route path="share/:unlockId" element={<ShareRenderPage />} />

        {/* SEO — one public landing page per skill node. Slug format:
            {tree_slug}-r{rank}-{name-slug}. Drives organic traffic per
            PLAN.md Phase 3. */}
        <Route path="learn/:slug" element={<NodeLandingPage />} />

        {/* Onboarding — also no Layout chrome; uses OnboardingLayout internally
            for its own progress + back/next affordances. */}
        <Route path="onboarding/q1" element={<OnboardingQ1Page />} />
        <Route path="onboarding/q2" element={<OnboardingQ2Page />} />
        <Route path="onboarding/test" element={<OnboardingTestPage />} />
        <Route path="onboarding/result" element={<OnboardingResultPage />} />

        {/* Sprint 42 — public 404 catch-all. Mounted at the END of the public
            routes block (just before RequireAuth) so it only catches unknown
            URLs in the public surface. Authed + onboarded users have their
            own catch-all (`<HomePage />`) inside the RequireAuth block below
            which catches typos in the authed app surface. */}
        <Route path="*" element={<NotFoundPage />} />

        <Route element={<RequireAuth />}>
          {/* Fully-onboarded app — auth + placement required */}
          <Route element={<RequireOnboarded />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />

              {/* T38 — production /settings route (gym-glare toggle, a11y baseline). */}
              <Route path="settings" element={<SettingsPage />} />

              {/* T39 — share card render page moved to PUBLIC routes above
                  (see /share/:unlockId outside RequireAuth) so social bots
                  can crawl it without auth. */}

              {/* Sprint 4 — workout log + done screens. Both authed + onboarded. */}
              <Route path="workout/:nodeId" element={<WorkoutLogPage />} />
              <Route path="workout/:nodeId/done" element={<WorkoutDonePage />} />

              {/* Sprint 5 — full DAG browser. Auth + onboarded required. */}
              <Route path="tree/:treeId" element={<TreePage />} />

              {/* Sprint 6 — tendon strain insights. */}
              <Route path="insights/tendon" element={<InsightsPage />} />

              {/* Sprint 11 — social feed (Path B differentiation). */}
              <Route path="feed" element={<FeedPage />} />
              <Route path="u/:userId" element={<ProfilePage />} />

              {/* Sprint 31 — workout history (local-mode backed, see local-mode.ts). */}
              <Route path="history" element={<HistoryPage />} />

              <Route path="*" element={<HomePage />} />
            </Route>
          </Route>

          {/* Auth-only — design review surface, no placement required */}
          <Route element={<Layout />}>
            {/* T35 — visual reference for the design system. */}
            <Route path="components" element={<ComponentsPage />} />

            {/* T37 wireframes — review only, do NOT replace production routes.
                Sprint 38: lazy-loaded — only fetched when ?dev=1. */}
            {(
              [
                ['wireframes', WireframesIndex],
                ['wireframes/landing', LandingWireframe],
                ['wireframes/login', LoginWireframe],
                ['wireframes/onboarding-q1', OnboardingQ1Wireframe],
                ['wireframes/onboarding-q2', OnboardingQ2Wireframe],
                ['wireframes/onboarding-q3', OnboardingQ3Wireframe],
                ['wireframes/onboarding-test', OnboardingTestWireframe],
                ['wireframes/onboarding-result', OnboardingResultWireframe],
                ['wireframes/home', HomeWireframe],
                ['wireframes/workout-log', WorkoutLogWireframe],
                ['wireframes/workout-done', WorkoutDoneWireframe],
                ['wireframes/feed', FeedWireframe],
                ['wireframes/friend-profile', FriendProfileWireframe],
                ['wireframes/tendon-insight', TendonInsightWireframe],
                ['wireframes/settings', SettingsWireframe],
                ['wireframes/paywall', PaywallWireframe],
                ['wireframes/subscription', SubscriptionWireframe],
                ['wireframes/empty-states', EmptyStatesWireframe],
              ] as Array<[string, React.LazyExoticComponent<() => React.JSX.Element>]>
            ).map(([path, Comp]) => (
              <Route
                key={path}
                path={path}
                element={
                  <Suspense fallback={null}>
                    <Comp />
                  </Suspense>
                }
              />
            ))}
          </Route>
        </Route>
      </Routes>
    </>
  );
}