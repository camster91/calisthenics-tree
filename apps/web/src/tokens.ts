/**
 * Calisthenics Tree — Design Tokens (foundation)
 *
 * Single source of truth for color, typography, spacing, motion.
 * Consumed by:
 *   - src/index.css `@theme { ... }` block (Tailwind v4 utilities)
 *   - React components reading tokens via the `cn()` helper or direct var() in CSS
 *   - Storybook / Wireframes (Phase 1.5 T37)
 *
 * Conventions:
 *   - Colors are SEMANTIC (surface, primary, danger), not raw (#0F172A). Raw values live here only.
 *   - Two themes: `default` (dark, default) and `gym-glare` (high-contrast, auto + manual toggle).
 *   - WCAG targets: AA (4.5:1) default, AAA (7:1) gym-glare. axe-core verifies.
 *   - Movement palette derived from doc2 visual guidelines: dark blue + orange.
 *
 * Phase 1.5 T34 will refine these values; this is the foundation scaffold so the
 * Phase 1.5 children have a target file to extend.
 */

export const tokens = {
  color: {
    // Surfaces — dark by default per doc2 (sweat-proof dark mode)
    surface: {
      bg: '#0B1220', // page background (dark blue near-black)
      subtle: '#111827', // card / panel background
      muted: '#1F2937', // hover / pressed
      fg: '#F8FAFC', // primary text
      'fg-muted': '#94A3B8', // secondary text
      'fg-subtle': '#7B8AA3', // tertiary text — passes WCAG AA on bg (5.36:1)
      border: '#1E293B', // hairline borders
    },
    // Brand primary — orange (doc2)
    primary: {
      DEFAULT: '#F97316', // orange-500
      hover: '#FB923C', // orange-400
      active: '#EA580C', // orange-600
      'on-primary': '#0B1220', // text on primary bg
    },
    // Semantic state
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#38BDF8',
    // DAG visualization (Phase 2)
    dag: {
      'node-locked': '#475569',
      'node-unlocked': '#94A3B8',
      'node-current': '#F97316', // glows
      edge: '#334155',
    },
    // Tendon strain (insights screen)
    tendon: {
      ok: '#22C55E',
      watch: '#F59E0B',
      deload: '#EF4444',
    },
    // Gym-glare variant overrides (AAA contrast)
    'gym-glare': {
      bg: '#000000',
      fg: '#FFFFFF',
      'fg-muted': '#E5E7EB',
      primary: '#FF8A1F', // brighter orange, passes AAA on black
      border: '#FFFFFF',
    },
  },

  font: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  },

  fontSize: {
    xs: '0.75rem', // 12px — captions, badges
    sm: '0.875rem', // 14px — secondary body
    base: '1rem', // 16px — body (WCAG AA floor)
    lg: '1.125rem', // 18px — large body
    xl: '1.25rem', // 20px — small headings
    '2xl': '1.5rem', // 24px — section headings
    '3xl': '1.875rem', // 30px — page headings
    '4xl': '2.25rem', // 36px — display
    '5xl': '3rem', // 48px — hero
    '6xl': '3.75rem', // 60px — marketing
    '7xl': '4.5rem', // 72px — hero display
    '8xl': '6rem', // 96px — WorkoutTimer big number
  },

  spacing: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem',
    12: '3rem',
    16: '4rem',
    18: '4.5rem', // extended — for the workout header
    24: '6rem',
    32: '8rem',
    48: '12rem',
    64: '16rem',
    88: '22rem', // extended — for full-bleed sections
  },

  radius: {
    none: '0',
    sm: '0.375rem', // 6px
    md: '0.75rem', // 12px — primary radius (cards, buttons)
    lg: '1rem', // 16px — modal panels
    xl: '1.5rem',
    full: '9999px', // pills, rep counter
  },

  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
    md: '0 4px 8px -2px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 12px 32px -8px rgb(0 0 0 / 0.6), 0 4px 8px -4px rgb(0 0 0 / 0.4)',
    glow: '0 0 24px 0 rgb(249 115 22 / 0.45)', // primary glow (current node)
  },

  motion: {
    micro: '150ms', // tap feedback, hover
    ui: '250ms', // modal open/close, sheet
    page: '400ms', // route transitions
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },

  /** Tap target floor (iOS HIG). gym-glare mode raises this. */
  tapTarget: {
    base: '48px',
    gymGlare: '56px',
  },

  /** Z-index scale. */
  z: {
    base: 0,
    raised: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    toast: 50,
  },
} as const;

export type Tokens = typeof tokens;
export default tokens;
