/**
 * UnlockShareCard — shareable card visual for "I just unlocked X".
 *
 * This is the HTML template T39 will rasterize to PNG for social
 * sharing. Renders inline at 1080x1080 logical resolution (the
 * typical IG square); scale-down via CSS for preview.
 *
 * - Brand colors: dark navy bg + primary orange accent.
 * - Big node name in the center.
 * - Sub-line: "Just unlocked" + tree slug.
 * - Bottom: small "calisthenicstree.app" mark.
 */
import { cn } from '../../lib/cn';

export interface UnlockShareCardProps {
  treeName: string;
  nodeName: string;
  /** Pre-formatted date string (e.g. "Jun 25, 2026"). */
  unlockedOn: string;
  className?: string;
  /** Used for the inline preview wrapper only. */
  preview?: boolean;
}

export function UnlockShareCard({
  treeName,
  nodeName,
  unlockedOn,
  className,
  preview,
}: UnlockShareCardProps) {
  return (
    <div
      data-share-template="unlock"
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-surface-border bg-surface',
        preview ? 'aspect-square w-full max-w-sm' : 'aspect-square w-[1080px] max-w-none',
        className,
      )}
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* Decorative gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col justify-between p-8">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-surface-fg-muted">
          <span>{treeName}</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Just unlocked
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-widest text-surface-fg-subtle">New skill</p>
          <h2 className="mt-2 text-balance text-4xl font-bold leading-tight text-surface-fg">
            {nodeName}
          </h2>
          <p className="mt-4 font-mono text-sm text-surface-fg-muted">{unlockedOn}</p>
        </div>

        <footer className="flex items-center justify-between text-xs text-surface-fg-subtle">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded-md bg-primary shadow-[0_0_10px_-2px_var(--color-primary)]" />
            <span className="font-semibold tracking-tight text-surface-fg-muted">
              Calisthenics Tree
            </span>
          </div>
          <span className="font-mono">calisthenicstree.app</span>
        </footer>
      </div>
    </div>
  );
}