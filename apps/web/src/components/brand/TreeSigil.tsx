/**
 * TreeSigil — the movement sigil for a skill tree.
 *
 * Brand sigil SVGs in /brand/icons (coloured with white detail, dark
 * backgrounds only). The Legs sigil is a hand-drawn placeholder shared with
 * the marketing site until a generated one exists.
 */
import { cn } from '../../lib/cn';
import type { Movement } from '../../lib/movement';

export interface TreeSigilProps {
  movement: Movement;
  /** Edge size in px. */
  size?: number;
  className?: string;
}

/** Decorative sigil (aria-hidden): the tree name is always written next to it. */
export function TreeSigil({ movement, size = 40, className }: TreeSigilProps) {
  return (
    <img
      src={`/brand/icons/sigil-${movement}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}

export default TreeSigil;
