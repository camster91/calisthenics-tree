/**
 * Wireframe — Login / Sign in.
 *
 * Production route: `/login`. Public. Priority P1.
 * Single screen, two states (empty + error). Empty is the default render.
 */
import { useState } from 'react';
import { Mail, Lock, GitBranch } from 'lucide-react';
import {
  PageHeader,
  InlineError,
  Section,
} from './_primitives';

export default function LoginWireframe() {
  const [state, setState] = useState<'empty' | 'error'>('empty');

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Welcome back"
        title="Sign in"
        description="Email + password, or continue with a provider."
      />

      <Section>
        {state === 'error' && (
          <div className="mb-4">
            <InlineError
              title="Could not sign you in"
              body="That email and password don't match. Try again or reset your password."
              retryHref="/wireframes/login"
            />
          </div>
        )}

        <form
          className="card space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setState('error');
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-2">
              <Mail aria-hidden className="h-4 w-4 text-surface-fg-subtle" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm focus:outline-none"
                aria-label="Email"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Password</span>
            <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-2">
              <Lock aria-hidden className="h-4 w-4 text-surface-fg-subtle" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-transparent text-sm focus:outline-none"
                aria-label="Password"
              />
            </div>
          </label>

          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>

          <div className="flex items-center gap-3 text-xs text-surface-fg-subtle">
            <div className="h-px flex-1 bg-surface-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-surface-border" />
          </div>

          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => setState('error')}
          >
            <GitBranch aria-hidden className="h-4 w-4" /> Continue with GitHub
          </button>

          <p className="text-center text-xs text-surface-fg-subtle">
            No account?{' '}
            <a className="text-primary underline" href="/onboarding/q1">
              Get started
            </a>
          </p>
        </form>
      </Section>

      {/* State picker — only visible on /wireframes/login */}
      <div className="text-center">
        <a
          href="/wireframes/login"
          className={`text-xs underline ${
            state === 'empty' ? 'text-primary' : 'text-surface-fg-subtle'
          }`}
        >
          empty state
        </a>{' '}
        ·{' '}
        <a
          href="/wireframes/login?state=error"
          className={`text-xs underline ${
            state === 'error' ? 'text-primary' : 'text-surface-fg-subtle'
          }`}
        >
          error state
        </a>
      </div>
    </div>
  );
}