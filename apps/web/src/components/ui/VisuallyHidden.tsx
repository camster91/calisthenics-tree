/**
 * VisuallyHidden — content kept in the accessibility tree but invisible.
 *
 * Use for screen-reader-only labels on icon-only buttons, form-field
 * descriptions, and the like. The "sr-only" Tailwind class is well-known
 * but doesn't accept props. This component composes the same CSS
 * with a TypeScript prop API.
 *
 * WCAG 2.4.6 (Headings and Labels) and 1.3.1 (Info and Relationships)
 * both rely on accessible names being available even when visual
 * treatments hide the text.
 */
import type { ReactNode, HTMLAttributes } from 'react';

const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** Render as a different element (e.g. for headings). Defaults to span. */
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p' | 'label';
}

export default function VisuallyHidden({
  children,
  as: Tag = 'span',
  style,
  ...rest
}: VisuallyHiddenProps) {
  return (
    <Tag style={{ ...srOnlyStyles, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
