import { Routes, Route } from 'react-router-dom';
import { useTheme } from './lib/theme';
import HomePage from './pages/HomePage';
import Layout from './components/layout/Layout';

/**
 * App root — router + theme bootstrap.
 *
 * Phase 1.5 children (T34-T40) will add routes for onboarding, workout log,
 * social feed, settings, paywall. This scaffold wires the router and theme
 * provider so children have a target structure to extend.
 */
export default function App() {
  // Initialize theme on mount (reads localStorage + OS preference).
  useTheme();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          {/* Phase 1.5 children will add: /onboarding, /workout/:node_id, /feed, /settings, /paywall */}
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </>
  );
}
