/**
 * UnlockShareCard — shareable card visual for "I just unlocked X".
 *
 * The HTML template rasterized to PNG for social sharing. Renders inline
 * at 1080x1080 logical resolution (the typical IG square); scale-down via
 * CSS for preview.
 *
 * Three variants (T39 spec):
 *  - `fresh`    — first-time unlock of a single node
 *  - `milestone`— 10th (or other round-number) skill unlock
 *  - `badge`    — badge-level achievement (e.g. unlocked all nodes in a tree)
 *
 * - Brand colors: dark navy bg + primary orange accent.
 * - Big node name in the center.
 * - Sub-line: variant-specific copy + tree slug + date.
 * - Bottom: small "calisthenicstree.app" mark.
 */
import { Sparkles, Trophy, Award } from 'lucide-react';
import { cn } from '../../lib/cn';

export type UnlockVariant = 'fresh' | 'milestone' | 'badge';

export interface UnlockShareCardProps {
  treeName: string;
  nodeName: string;
  /** Pre-formatted date string (e.g. "Jun 25, 2026"). */
  unlockedOn: string;
  /** Optional: "X second hold", "23 reps", etc. */
  statsLine?: string;
  /** Optional: ordinal count of skills unlocked so far (e.g. "10th"). */
  unlockCount?: string;
  /** Optional: tree slug (e.g. "front-lever") for the share URL. */
  treeSlug?: string;
  /** Variant visual. Defaults to `fresh`. */
  variant?: UnlockVariant;
  className?: string;
  /** Used for the inline preview wrapper only. */
  preview?: boolean;
}

const VARIANT_META: Record<
  UnlockVariant,
  { badge: string; eyebrow: string; Icon: typeof Sparkles }
> = {
  fresh: {
    badge: 'Just unlocked',
    eyebrow: 'New skill',
    Icon: Sparkles,
  },
  milestone: {
    badge: 'Milestone',
    eyebrow: 'Skill unlocked',
    Icon: Trophy,
  },
  badge: {
    badge: 'Tree cleared',
    eyebrow: 'Badge earned',
    Icon: Award,
  },
};

export function UnlockShareCard({
  treeName,
  nodeName,
  unlockedOn,
  statsLine,
  unlockCount,
  treeSlug,
  variant = 'fresh',
  className,
  preview,
}: UnlockShareCardProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.Icon;

  return (
    <div
      data-share-template="unlock"
      data-share-variant={variant}
      data-tree-slug={treeSlug}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-surface-border bg-surface',
        preview ? 'aspect-square w-full max-w-sm' : 'aspect-square w-[1080px] max-w-none',
        className,
      )}
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* Decorative gradient orbs — stronger on milestone/badge to add weight */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl',
          variant !== 'fresh' && 'bg-primary/50',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl',
          variant === 'badge' && 'bg-primary/40',
        )}
      />

      {/* Badge-level visual treatment: the existing header badge is already
          "Tree cleared" for this variant, the title is bumped to text-6xl,
          and the orbs are 50% stronger. The corner ribbon was tried but
          caused "Tree Cleared" duplication in the top-right, and rotated
          banners are fragile (clipping at 1080x1080). Keeping it minimal
          here is the production choice. */}
      <div className="relative flex h-full flex-col justify-between p-8">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-surface-fg-muted">
          <span className="flex items-center gap-2">
            <Icon aria-hidden className="h-4 w-4" />
            {treeName}
          </span>
          <span
            className={cn(
              'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary',
              variant === 'milestone' && 'bg-primary/30',
              variant === 'badge' && 'bg-primary text-primary-on',
            )}
          >
            {meta.badge}
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-widest text-surface-fg-subtle">
            {meta.eyebrow}
            {unlockCount ? ` · ${unlockCount}` : null}
          </p>
          <h2
            className={cn(
              'mt-2 text-balance font-bold leading-tight text-surface-fg',
              variant === 'badge' ? 'text-6xl' : 'text-4xl',
            )}
          >
            {nodeName}
          </h2>
          {statsLine && (
            <p className="mt-4 text-sm text-surface-fg-muted">{statsLine}</p>
          )}
          <p className="mt-2 font-mono text-sm text-surface-fg-muted">{unlockedOn}</p>
        </div>

        <footer className="flex items-center justify-between text-xs text-surface-fg-subtle">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded-md bg-primary shadow-[0_0_10px_-2px_var(--color-primary)]" />
            <span className="font-semibold tracking-tight text-surface-fg-muted">
              Calisthenics Tree
            </span>
          </div>
          <span className="font-mono">workout.ashbi.ca</span>
        </footer>
      </div>
    </div>
  );
}

export default UnlockShareCard;
