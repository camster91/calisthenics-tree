import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './lib/i18n'; // initializes i18next — must come before App renders
import { initAnalytics } from './lib/analytics';
import { AuthProvider } from './lib/auth';
import { OnboardingProvider } from './lib/onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Phase 2 — PLAN.md Gap 4. No-op when VITE_POSTHOG_API_KEY is unset.
initAnalytics();

// Sprint 37 audit fix (RED-2): ErrorBoundary wraps <BrowserRouter> so render
// throws from React Router internals + every page below are caught and
// reported via analytics.captureException instead of producing a blank white
// screen.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <OnboardingProvider>
            <App />
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
