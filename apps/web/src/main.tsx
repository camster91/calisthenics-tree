import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './lib/i18n'; // initializes i18next — must come before App renders
import { initAnalytics } from './lib/analytics';
import { AuthProvider } from './lib/auth';
import { OnboardingProvider } from './lib/onboarding';
import './index.css';

// Phase 2 — PLAN.md Gap 4. No-op when VITE_POSTHOG_API_KEY is unset.
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
          <App />
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
