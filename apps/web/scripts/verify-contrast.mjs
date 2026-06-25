#!/usr/bin/env node
/**
 * WCAG contrast verifier — checks every semantic foreground/background pair
 * defined in `tokens.ts` against WCAG 2.1 AA (4.5:1 body, 3:1 large/UI) and
 * AAA (7:1) thresholds for the gym-glare variant.
 *
 * Pairs are explicit (foreground + background) — not exhaustive — but cover
 * every color role used in components:
 *
 *   surface.fg           on surface.bg            (body text)
 *   surface.fg-muted     on surface.bg            (secondary text — AA)
 *   surface.fg-subtle    on surface.bg            (tertiary — informational)
 *   primary.DEFAULT      on surface.bg            (CTA on page)
 *   primary.on-primary   on primary.DEFAULT       (text on CTA)
 *   danger/success/      on surface.bg            (status chips)
 *     warning/info
 *   dag.node-current     on surface.bg            (active DAG node)
 *   dag.node-unlocked    on surface.bg            (inactive node)
 *   tendon.ok/watch/     on surface.bg            (insight badges)
 *     deload
 *
 * Run via `npm run verify:tokens`. Exits non-zero on any failure.
 */
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { tokens } = await import(
  pathToFileURL(resolve(__dirname, '../src/tokens.ts')).href
);

// ── helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/^(..)(..)(..)$/);
  if (!m) throw new Error(`bad hex: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relLuminance(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const L1 = relLuminance(hexToRgb(fg));
  const L2 = relLuminance(hexToRgb(bg));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const fmt = (r) => `${r.toFixed(2)}:1`;

// Pairs: [name, fg, bg, threshold (AA=4.5 body / 3.0 large / AAA=7.0)]
const defaultPairs = [
  ['surface.fg on surface.bg (body)', tokens.color.surface.fg, tokens.color.surface.bg, 4.5],
  ['surface.fg-muted on surface.bg (secondary)', tokens.color.surface['fg-muted'], tokens.color.surface.bg, 4.5],
  ['surface.fg-subtle on surface.bg (tertiary)', tokens.color.surface['fg-subtle'], tokens.color.surface.bg, 3.0],
  ['primary.DEFAULT on surface.bg (CTA on page)', tokens.color.primary.DEFAULT, tokens.color.surface.bg, 4.5],
  ['primary.on-primary on primary.DEFAULT (text on CTA)', tokens.color.primary['on-primary'], tokens.color.primary.DEFAULT, 4.5],
  ['danger on surface.bg', tokens.color.danger, tokens.color.surface.bg, 4.5],
  ['success on surface.bg', tokens.color.success, tokens.color.surface.bg, 4.5],
  ['warning on surface.bg', tokens.color.warning, tokens.color.surface.bg, 4.5],
  ['info on surface.bg', tokens.color.info, tokens.color.surface.bg, 4.5],
  ['dag.node-current on surface.bg (active node)', tokens.color.dag['node-current'], tokens.color.surface.bg, 3.0],
  ['dag.node-unlocked on surface.bg', tokens.color.dag['node-unlocked'], tokens.color.surface.bg, 3.0],
  ['tendon.ok on surface.bg', tokens.color.tendon.ok, tokens.color.surface.bg, 4.5],
  ['tendon.watch on surface.bg', tokens.color.tendon.watch, tokens.color.surface.bg, 4.5],
  ['tendon.deload on surface.bg', tokens.color.tendon.deload, tokens.color.surface.bg, 4.5],
];

// Gym-glare: stricter AAA on pure black, with brighter primary/semantic
const g = tokens.color['gym-glare'];
const gymGlarePairs = [
  ['GG: surface.fg on surface.bg (AAA)', g.fg, g.bg, 7.0],
  ['GG: surface.fg-muted on surface.bg (AAA)', g['fg-muted'], g.bg, 7.0],
  ['GG: primary.DEFAULT on surface.bg (AAA)', g.primary, g.bg, 7.0],
  // Brightened semantic colors (see build-theme.ts gym-glare block)
  ['GG: danger (AAA)', '#ff6b6b', g.bg, 7.0],
  ['GG: success (AAA)', '#4ade80', g.bg, 7.0],
  ['GG: warning (AAA)', '#fbbf24', g.bg, 7.0],
  ['GG: info (AAA)', '#7dd3fc', g.bg, 7.0],
];

const all = [...defaultPairs, ...gymGlarePairs];

// Pairs for filled-badge text-on-fill (T35) and the destructive button.
// These aren't in tokens.ts because they use one-off Tailwind shades, but
// they ship in the design system and need to stay accessible.
const badgePairs = [
  // T35 badge: dark text on bright fill.
  ['badge: green-900 #052e16 on success #22C55E', '#052e16', '#22C55E', 4.5],
  ['badge: amber-900 #451a03 on warning #F59E0B', '#451a03', '#F59E0B', 4.5],
  // T35 badge: white on red-700.
  ['badge: white on red-700 #B91C1C', '#ffffff', '#B91C1C', 4.5],
  // T35 button: white on red-700 (destructive).
  ['btn-destructive: white on red-700 #B91C1C', '#ffffff', '#B91C1C', 4.5],
  // Locked card content — bg-surface-muted (#1F2937) holding muted text.
  // Used so axe-core stays green on the locked NodeCard.
  ['locked: fg-muted #94A3B8 on surface-muted #1F2937', '#94A3B8', '#1F2937', 4.5],
  ['locked: fg-subtle #64748B on surface-muted #1F2937', '#64748B', '#1F2937', 3.0],
];

const allWithBadges = [...all, ...badgePairs];
let failed = 0;

console.log('WCAG 2.1 contrast verification — design tokens');
console.log('─'.repeat(72));
for (const [name, fg, bg, threshold] of allWithBadges) {
  const r = contrastRatio(fg, bg);
  const pass = r >= threshold;
  const verdict = pass ? 'PASS' : 'FAIL';
  const marker = pass ? '  ' : '!!';
  console.log(
    `${marker} ${verdict}  ${fmt(r).padStart(8)}  (≥${threshold})  ${name}`,
  );
  if (!pass) failed += 1;
}
console.log('─'.repeat(72));

if (failed > 0) {
  console.error(`\n${failed}/${allWithBadges.length} pair(s) failed contrast check.`);
  process.exit(1);
} else {
  console.log(`\nAll ${allWithBadges.length} pair(s) pass.`);
}
