/**
 * Theme CSS generator — pure function that converts `tokens.ts` into the
 * `@theme { ... }` block + `gym-glare` variant override CSS that Tailwind v4
 * consumes.
 *
 * Why a generator instead of a hand-maintained `index.css` `@theme` block?
 * Tailwind v4 dropped `tailwind.config.{js,ts}` — the theme lives in CSS.
 * But hand-mirroring the values between `tokens.ts` (the runtime source of
 * truth used by components) and CSS invites drift. This generator makes
 * `tokens.ts` the single source: edit a value there, the CSS rebuilds.
 *
 * The build is invoked by `vite/plugin-theme.ts` on dev server start and on
 * `tokens.ts` change (Vite HMR picks it up). Tests / CI invoke it via
 * `scripts/verify-contrast.ts`.
 */
import { tokens } from '../tokens.ts';

/**
 * Map a camelCase token key to a kebab-case CSS variable suffix.
 *   nodeLocked -> node-locked
 *   fgMuted    -> fg-muted
 */
function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function colorVar(group: string, key: string): string {
  // Tailwind v4 convention: the DEFAULT color for a group has no suffix,
  // so `bg-surface` works. Sub-keys get a kebab suffix (`bg-surface-muted`).
  //   `surface.bg`         -> `--color-surface`           (default, no suffix)
  //   `surface.subtle`     -> `--color-surface-subtle`
  //   `primary.DEFAULT`    -> `--color-primary`           (default, no suffix)
  //   `primary.on-primary` -> `--color-primary-on`        (drop "primary" redundancy)
  let suffix = '';
  if (key !== 'DEFAULT' && key !== 'bg') {
    // `primary.on-primary` -> `on` (we already have `--color-primary`, the
    // `primary` half of the key is redundant — exposes `text-primary-on`).
    let trimmed = key;
    if (group === 'primary' && key.startsWith('on-primary')) {
      trimmed = 'on';
    }
    suffix = `-${kebab(trimmed)}`;
  }
  return `--color-${kebab(group)}${suffix}`;
}

function fontVar(key: string): string {
  return `--font-${kebab(key)}`;
}

function fontSizeVar(key: string): string {
  return `--text-${kebab(key)}`;
}

function radiusVar(key: string): string {
  return `--radius-${kebab(key)}`;
}

function shadowVar(key: string): string {
  return `--shadow-${kebab(key)}`;
}

function spacingVar(key: string): string {
  // Tailwind v4 uses --spacing as the base unit; per-size tokens use
  // --spacing-<n> or just inline in @theme. We use --spacing-<key>.
  if (key === 'px') return '--spacing-px';
  return `--spacing-${key}`;
}

function zVar(key: string): string {
  return `--z-index-${kebab(key)}`;
}

/** Build the `@theme { ... }` block. */
export function buildThemeBlock(): string {
  const lines: string[] = ['@theme {'];

  // Surfaces
  for (const [k, v] of Object.entries(tokens.color.surface)) {
    lines.push(`  ${colorVar('surface', k)}: ${v};`);
  }

  // Primary
  for (const [k, v] of Object.entries(tokens.color.primary)) {
    lines.push(`  ${colorVar('primary', k)}: ${v};`);
  }

  // Semantic
  for (const k of ['danger', 'success', 'warning', 'info'] as const) {
    lines.push(`  ${colorVar(k, 'DEFAULT')}: ${tokens.color[k]};`);
  }

  // DAG
  for (const [k, v] of Object.entries(tokens.color.dag)) {
    lines.push(`  ${colorVar('dag', k)}: ${v};`);
  }

  // Tendon
  for (const [k, v] of Object.entries(tokens.color.tendon)) {
    lines.push(`  ${colorVar('tendon', k)}: ${v};`);
  }

  // Fonts
  for (const [k, v] of Object.entries(tokens.font)) {
    lines.push(`  ${fontVar(k)}: ${v};`);
  }

  // Font sizes
  for (const [k, v] of Object.entries(tokens.fontSize)) {
    lines.push(`  ${fontSizeVar(k)}: ${v};`);
  }

  // Radii
  for (const [k, v] of Object.entries(tokens.radius)) {
    lines.push(`  ${radiusVar(k)}: ${v};`);
  }

  // Shadows
  for (const [k, v] of Object.entries(tokens.shadow)) {
    lines.push(`  ${shadowVar(k)}: ${v};`);
  }

  // Spacing (Tailwind v4 default --spacing is 0.25rem; per-step values)
  for (const [k, v] of Object.entries(tokens.spacing)) {
    lines.push(`  ${spacingVar(k)}: ${v};`);
  }

  // Z-index
  for (const [k, v] of Object.entries(tokens.z)) {
    lines.push(`  ${zVar(k)}: ${v};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Build the gym-glare override block — same variable names as @theme, but
 * values chosen for AAA contrast (7:1 text on background). Activated by
 * `<html data-theme="gym-glare">`.
 */
export function buildGymGlareBlock(): string {
  const g = tokens.color['gym-glare'];
  const lines: string[] = [":root[data-theme='gym-glare'] {"];

  // Surfaces — pure black bg, pure white fg, white border
  lines.push(`  ${colorVar('surface', 'bg')}: ${g.bg};`);
  lines.push(`  ${colorVar('surface', 'subtle')}: ${g.bg};`);
  lines.push(`  ${colorVar('surface', 'muted')}: #0a0a0a;`);
  lines.push(`  ${colorVar('surface', 'fg')}: ${g.fg};`);
  lines.push(`  ${colorVar('surface', 'fg-muted')}: ${g['fg-muted']};`);
  lines.push(`  ${colorVar('surface', 'fg-subtle')}: #d4d4d8;`);
  lines.push(`  ${colorVar('surface', 'border')}: ${g.border};`);

  // Primary — brighter orange that passes AAA on black
  lines.push(`  ${colorVar('primary', 'DEFAULT')}: ${g.primary};`);
  lines.push(`  ${colorVar('primary', 'hover')}: #ffae5e;`);
  lines.push(`  ${colorVar('primary', 'active')}: ${g.primary};`);
  lines.push(`  ${colorVar('primary', 'on')}: #000000;`);

  // Semantic — brighter variants for AAA contrast on black
  // (kept identical to default for danger/success/warning/info; AAA on
  // black is satisfied by the default values, verified in verify-contrast)
  lines.push(`  ${colorVar('danger', 'DEFAULT')}: #ff6b6b;`);
  lines.push(`  ${colorVar('success', 'DEFAULT')}: #4ade80;`);
  lines.push(`  ${colorVar('warning', 'DEFAULT')}: #fbbf24;`);
  lines.push(`  ${colorVar('info', 'DEFAULT')}: #7dd3fc;`);

  lines.push('}');
  return lines.join('\n');
}

/** Full generated CSS — written to `.generated/theme.css` by the Vite plugin. */
export function buildThemeCss(): string {
  const header = [
    '/* ─────────────────────────────────────────────────────────────────',
    ' * AUTO-GENERATED from src/tokens.ts — DO NOT EDIT BY HAND',
    ' * Regenerate via `npm run theme:build` or the Vite dev server.',
    ' * Source: src/lib/build-theme.ts',
    ' * ──────────────────────────────────────────────────────────────── */',
    '',
  ].join('\n');

  return header + buildThemeBlock() + '\n\n' + buildGymGlareBlock() + '\n';
}
