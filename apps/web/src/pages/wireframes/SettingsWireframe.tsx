/**
 * Wireframe — Settings.
 *
 * Production route: `/settings`. Authed. Priority P2.
 * Single render. Theme toggle (default ⇄ gym-glare), account, units.
 */
import { Moon, Sun, User, Bell, Globe, LogOut } from 'lucide-react';
import { PageHeader, Section } from './_primitives';

function Row({
  Icon,
  title,
  body,
  trailing,
}: {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  body?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-surface-fg-muted">
          <Icon aria-hidden className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {body && <p className="text-xs text-surface-fg-muted">{body}</p>}
        </div>
      </div>
      {trailing}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-primary' : 'bg-surface-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </span>
  );
}

export default function SettingsWireframe() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account & app"
        description="Profile, theme, units, notifications, and billing."
      />

      <Section title="Account">
        <div className="card divide-y divide-surface-border">
          <Row Icon={User} title="Profile" body="Name, handle, bio" trailing={<a className="btn-ghost" href="/wireframes/friend-profile">View public</a>} />
          <Row Icon={Bell} title="Notifications" body="Workout reminders, friend activity" trailing={<Toggle on={true} />} />
          <Row Icon={Globe} title="Units" body="kg / lb, cm / in" trailing={<span className="chip">kg · cm</span>} />
          <Row Icon={LogOut} title="Sign out" trailing={<button className="btn-danger" type="button">Sign out</button>} />
        </div>
      </Section>

      <Section title="Display">
        <div className="card divide-y divide-surface-border">
          <Row
            Icon={Moon}
            title="Theme"
            body="Gym-glare = high contrast for outdoor / sweaty use"
            trailing={<Toggle on={false} />}
          />
          <Row
            Icon={Sun}
            title="Auto-detect high contrast"
            body="Follow OS prefers-contrast: more"
            trailing={<Toggle on={true} />}
          />
        </div>
      </Section>

      <Section title="Subscription">
        <div className="card flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Free plan</p>
            <p className="text-xs text-surface-fg-muted">
              Upgrade to Pro for tendon insights and friends {`>`} 5.
            </p>
          </div>
          <a className="btn-primary" href="/wireframes/paywall">
            Upgrade
          </a>
        </div>
      </Section>

      <p className="text-center text-xs text-surface-fg-subtle">
        Calisthenics Tree v0.1.0 · build T37 wireframes
      </p>
    </div>
  );
}