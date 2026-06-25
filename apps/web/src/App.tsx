import { Routes, Route } from 'react-router-dom';
import { useTheme } from './lib/theme';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import ComponentsPage from './pages/ComponentsPage';
import Layout from './components/layout/Layout';

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

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />

          {/* T38 — production /settings route (gym-glare toggle, a11y baseline). */}
          <Route path="settings" element={<SettingsPage />} />

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

          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </>
  );
}