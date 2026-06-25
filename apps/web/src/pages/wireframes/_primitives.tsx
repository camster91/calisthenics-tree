/**
 * Wireframe primitives — low-fi building blocks for the v1 screen review.
 *
 * Real components, placeholder content. Everything reads from tokens (via
 * Tailwind utilities) — no inline hex, no hardcoded fonts. Screens in
 * /wireframes/* compose these primitives instead of building chrome.
 */
import { type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Circle,
  Inbox,
  Mountain,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Section — vertical rhythm container                                */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  description,
  children,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      {(title || action) && (
        <header className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-surface-fg-muted">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader — page-level title bar                                   */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3 text-balance">
      {eyebrow && <p className="chip">{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-base text-surface-fg-muted">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState — empty/error states share this layout                   */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  primaryCta,
  secondaryCta,
  tone = 'neutral',
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  tone?: 'neutral' | 'danger';
}) {
  const iconWrap =
    tone === 'danger'
      ? 'bg-danger/15 text-danger ring-1 ring-danger/40'
      : 'bg-primary/15 text-primary ring-1 ring-primary/40';
  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${iconWrap}`}
      >
        <Icon aria-hidden className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-surface-fg-muted">{body}</p>
      </div>
      {(primaryCta || secondaryCta) && (
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {primaryCta && (
            <a className="btn-primary" href={primaryCta.href}>
              {primaryCta.label}
            </a>
          )}
          {secondaryCta && (
            <a className="btn-ghost" href={secondaryCta.href}>
              {secondaryCta.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton — loading placeholders                                     */
/* ------------------------------------------------------------------ */

export function Skeleton({
  variant = 'block',
  className = '',
}: {
  variant?: 'line' | 'block' | 'circle' | 'ring';
  className?: string;
}) {
  const base =
    'animate-pulse bg-gradient-to-r from-surface-muted via-surface-border to-surface-muted bg-[length:200%_100%]';
  if (variant === 'line')
    return (
      <div
        aria-hidden
        className={`h-3 w-full rounded-md ${base} ${className}`}
      />
    );
  if (variant === 'circle')
    return (
      <div
        aria-hidden
        className={`h-10 w-10 rounded-full ${base} ${className}`}
      />
    );
  if (variant === 'ring')
    return (
      <div
        aria-hidden
        className={`h-14 w-14 rounded-full ring-4 ring-surface-muted ${base} ${className}`}
      />
    );
  return (
    <div
      aria-hidden
      className={`h-24 w-full rounded-lg ${base} ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* InlineError — recoverable error banner                              */
/* ------------------------------------------------------------------ */

export function InlineError({
  title = 'Something went wrong',
  body,
  retryHref,
}: {
  title?: string;
  body: string;
  retryHref?: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4"
    >
      <AlertTriangle
        aria-hidden
        className="mt-0.5 h-5 w-5 shrink-0 text-danger"
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-danger">{title}</p>
        <p className="text-sm text-surface-fg-muted">{body}</p>
      </div>
      {retryHref && (
        <a className="btn-danger shrink-0" href={retryHref}>
          Retry
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PlaceholderDAG — visual stand-in for the real tree (T35 owns real) */
/* ------------------------------------------------------------------ */

export function PlaceholderDAG({ compact = false }: { compact?: boolean }) {
  const rows = compact ? 3 : 5;
  const nodesPerRow = 3;
  const totalNodes = rows * nodesPerRow; // 9 (compact) or 15
  const unlocked = compact ? 3 : 3;
  const nodes = Array.from({ length: totalNodes }, (_, i) => i);
  return (
    <div className="card space-y-6 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="chip">DAG preview · placeholder</p>
          <h3 className="text-lg font-semibold">
            Push → Handstand Push-up Path
          </h3>
        </div>
        <span className="chip text-surface-fg-subtle">
          {totalNodes} nodes · {unlocked} unlocked
        </span>
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${nodesPerRow}, minmax(120px, 1fr))`,
        }}
      >
        {nodes.map((i) => {
          const state =
            i % 7 === 0
              ? 'current'
              : i < 6
                ? 'unlocked'
                : 'locked';
          const tone =
            state === 'current'
              ? 'bg-primary/20 ring-2 ring-primary text-primary shadow-glow'
              : state === 'unlocked'
                ? 'bg-surface-muted text-surface-fg ring-1 ring-surface-border'
                : 'bg-surface-subtle text-surface-fg-subtle ring-1 ring-surface-border';
          return (
            <div
              key={i}
              className={`flex h-20 flex-col items-center justify-center rounded-md text-xs font-medium ${tone}`}
            >
              <Mountain aria-hidden className="mb-1 h-4 w-4" />
              <span>Node {i + 1}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-surface-fg-subtle">
        Real DAG (T35) replaces this with the typed graph. Placeholder uses the
        dag-locked / dag-unlocked / dag-current tokens to confirm the design
        reads.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StateSwitcher — drives ?state=preview for multi-state screens       */
/* ------------------------------------------------------------------ */

export function StateSwitcher({
  screen,
  active,
}: {
  screen: string;
  active: 'empty' | 'loading' | 'error' | 'success';
}) {
  const states: Array<'empty' | 'loading' | 'error' | 'success'> = [
    'empty',
    'loading',
    'error',
    'success',
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-subtle p-1 text-xs">
      <span className="px-2 text-surface-fg-subtle">State:</span>
      {states.map((s) => (
        <a
          key={s}
          href={`/wireframes/${screen}?state=${s}`}
          className={`rounded px-2 py-1 font-medium transition-colors ${
            active === s
              ? 'bg-primary text-primary-on'
              : 'text-surface-fg-muted hover:bg-surface-muted'
          }`}
        >
          {s}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatChip — small inline metric                                     */
/* ------------------------------------------------------------------ */

export function StatChip({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-surface-border text-surface-fg',
    success: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
    danger: 'border-danger/40 text-danger',
  };
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border bg-surface-subtle px-3 py-2 ${tones[tone]}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-surface-fg-subtle">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spinner — bare loading indicator (for non-skeleton loads)          */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 text-sm text-surface-fg-muted"
    >
      <Activity aria-hidden className="h-4 w-4 animate-pulse text-primary" />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PlaceholderAvatar / PlaceholderLine — visual filler                */
/* ------------------------------------------------------------------ */

export function PlaceholderAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-muted text-surface-fg-subtle"
      style={{ width: size, height: size }}
    >
      <Circle className="h-1/2 w-1/2" />
    </div>
  );
}

export function PlaceholderLine({ width = '100%' }: { width?: string | number }) {
  return (
    <div
      aria-hidden
      className="h-2 rounded-full bg-surface-muted"
      style={{ width }}
    />
  );
}