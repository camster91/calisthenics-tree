import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTheme } from './lib/theme';
import { capturePageview } from './lib/analytics';
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
import Layout from './components/layout/Layout';
import { RequireAuth } from './components/RequireAuth';
import { RequireOnboarded } from './components/RequireOnboarded';
import Screenshots from './pages/marketing/Screenshots';
import OnboardingDemo from './pages/marketing/OnboardingDemo';

// Wireframe review surface — T37 deliverable. Not wired into production
// navigation; the `/wireframes/*` namespace is gated by Layout visibility
// (the "Wireframes" link in the nav shows when ?dev=1 is set OR always in
// dev builds). Screens render real components with placeholder content.
import WireframesIndex from './pages/wireframes/index';
import LandingWireframe from './pages/wireframes/LandingWireframe';
import LoginWireframe from './pages/wireframes/LoginWireframe';
import OnboardingQ1Wireframe from './pages/wireframes/OnboardingQ1Wireframe';
import OnboardingQ2Wireframe from './pages/wireframes/OnboardingQ2Wireframe';
import OnboardingQ3Wireframe from './pages/wireframes/OnboardingQ3Wireframe';
import OnboardingTestWireframe from './pages/wireframes/OnboardingTestWireframe';
import OnboardingResultWireframe from './pages/wireframes/OnboardingResultWireframe';
import HomeWireframe from './pages/wireframes/HomeWireframe';
import WorkoutLogWireframe from './pages/wireframes/WorkoutLogWireframe';
import WorkoutDoneWireframe from './pages/wireframes/WorkoutDoneWireframe';
import FeedWireframe from './pages/wireframes/FeedWireframe';
import FriendProfileWireframe from './pages/wireframes/FriendProfileWireframe';
import TendonInsightWireframe from './pages/wireframes/TendonInsightWireframe';
import SettingsWireframe from './pages/wireframes/SettingsWireframe';
import PaywallWireframe from './pages/wireframes/PaywallWireframe';
import SubscriptionWireframe from './pages/wireframes/SubscriptionWireframe';
import EmptyStatesWireframe from './pages/wireframes/EmptyStatesWireframe';

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
            Playwright script (scripts/render-marketing.ts) for PNG export. */}
        <Route path="marketing/screenshots" element={<Screenshots />} />
        <Route path="marketing/screenshots/:slot" element={<Screenshots />} />

        {/* T40 — App Store Connect preview video frames. Same model as the
            static screenshots — 1290x2796 stand-alone renders, no Layout,
            hit by scripts/render-onboarding-video.ts which encodes a
            15-30s mp4 via ffmpeg. */}
        <Route path="marketing/onboarding" element={<OnboardingDemo />} />
        <Route path="marketing/onboarding/:step" element={<OnboardingDemo />} />

        {/* Auth — public routes, no Layout chrome (no nav while not signed in) */}
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/verify" element={<AuthVerifyPage />} />

        {/* Marketing + legal — public, no chrome. /welcome is the public
            landing for new visitors. */}
        <Route path="welcome" element={<LandingPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

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

              <Route path="*" element={<HomePage />} />
            </Route>
          </Route>

          {/* Auth-only — design review surface, no placement required */}
          <Route element={<Layout />}>
            {/* T35 — visual reference for the design system. */}
            <Route path="components" element={<ComponentsPage />} />

            {/* T37 wireframes — review only, do NOT replace production routes */}
            <Route path="wireframes" element={<WireframesIndex />} />
            <Route path="wireframes/landing" element={<LandingWireframe />} />
            <Route path="wireframes/login" element={<LoginWireframe />} />
            <Route path="wireframes/onboarding-q1" element={<OnboardingQ1Wireframe />} />
            <Route path="wireframes/onboarding-q2" element={<OnboardingQ2Wireframe />} />
            <Route path="wireframes/onboarding-q3" element={<OnboardingQ3Wireframe />} />
            <Route path="wireframes/onboarding-test" element={<OnboardingTestWireframe />} />
            <Route path="wireframes/onboarding-result" element={<OnboardingResultWireframe />} />
            <Route path="wireframes/home" element={<HomeWireframe />} />
            <Route path="wireframes/workout-log" element={<WorkoutLogWireframe />} />
            <Route path="wireframes/workout-done" element={<WorkoutDoneWireframe />} />
            <Route path="wireframes/feed" element={<FeedWireframe />} />
            <Route path="wireframes/friend-profile" element={<FriendProfileWireframe />} />
            <Route path="wireframes/tendon-insight" element={<TendonInsightWireframe />} />
            <Route path="wireframes/settings" element={<SettingsWireframe />} />
            <Route path="wireframes/paywall" element={<PaywallWireframe />} />
            <Route path="wireframes/subscription" element={<SubscriptionWireframe />} />
            <Route path="wireframes/empty-states" element={<EmptyStatesWireframe />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}