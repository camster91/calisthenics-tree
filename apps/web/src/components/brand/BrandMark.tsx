/**
 * BrandMark — logo (pull-up bar + three rising nodes) + "Calisthenics Tree"
 * wordmark in Saira 800 condensed (Brand Lock V3).
 *
 * The logo is white with an orange top node, so it is only for dark
 * backgrounds (which is every surface in this app).
 */
import { cn } from '../../lib/cn';

export interface BrandMarkProps {
  /** Logo edge in px. Wordmark scales with it. */
  size?: number;
  /** Hide the wordmark (logo only). The logo then carries the accessible name. */
  logoOnly?: boolean;
  className?: string;
}

export function BrandMark({ size = 32, logoOnly = false, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/brand/logo.svg"
        width={size}
        height={size}
        alt={logoOnly ? 'Calisthenics Tree' : ''}
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      {!logoOnly && (
        <span
          className="font-display font-heavy leading-none tracking-display text-surface-fg [font-stretch:80%]"
          style={{ fontSize: Math.round(size * 0.62) }}
        >
          Calisthenics Tree
        </span>
      )}
    </span>
  );
}

export default BrandMark;
