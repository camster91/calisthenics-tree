/**
 * Calisthenics Tree — Design Tokens (Apple Fitness+ direction, Sprint 37)
 *
 * Single source of truth for color, typography, spacing, motion, blur.
 * Consumed by:
 *   - src/index.css `@theme { ... }` block (Tailwind v4 utilities, via build-theme.ts)
 *   - React components reading tokens via the `cn()` helper or direct var() in CSS
 *   - Storybook / Wireframes (Phase 1.5 T37)
 *
 * Conventions:
 *   - Colors are SEMANTIC (surface, primary, danger), not raw (#0F172A). Raw values live here only.
 *   - Two themes: `default` (dark, immersive — Fitness+ direction) and `gym-glare`
 *     (high-contrast, auto + manual toggle).
 *   - WCAG targets: AA (4.5:1) default, AAA (7:1) gym-glare. axe-core verifies.
 *   - Movement palette: warm orange-red on true black. Fitness+ energy.
 *
 * Apple Fitness+ design language:
 *   - True black immersive surface (#000) — not developer dark-mode blue-black
 *   - Squircle radii (20px primary, 28px hero) — iOS-style continuous corners
 *   - Heavy display weights (700-800) + tight tracking (-0.022em) on sizes ≥2xl
 *   - Spring-like motion (overshoot cubic-bezier) for tactile press feedback
 *   - Glass surfaces (rgba + backdrop-blur) for floating cards / sheets
 *   - Soft, wide glow on the active node (was punchy and small)
 */

export const tokens = {
  color: {
    // Surfaces — true black, immersive Fitness+ feel
    surface: {
      bg: '#000000', // page background (true black, immersive)
      subtle: '#0A0A0C', // card / panel background (lifted off bg)
      muted: '#1C1C1E', // hover / pressed (Apple systemGray6)
      fg: '#FFFFFF', // primary text (pure white for max contrast on black)
      'fg-muted': '#AEAEB2', // secondary text (Apple systemGray3 — passes AA on bg 7.04:1)
      'fg-subtle': '#8E8E93', // tertiary text (Apple systemGray4 — 5.36:1)
      border: 'rgba(255, 255, 255, 0.08)', // hairline borders (iOS separator style)
      'border-strong': 'rgba(255, 255, 255, 0.16)', // emphasized borders
    },
    // Brand primary — warm orange-red, Fitness+ energy
    primary: {
      DEFAULT: '#FF6B1A', // warmer orange-red than #F97316, more "fire" than "construction"
      hover: '#FF8A4A', // brighter on hover (tactile lift)
      active: '#E5550F', // pressed state
      'on-primary': '#000000', // text on primary bg (black on orange — passes AAA)
    },
    // 2nd-tier accents — for achievements / state
    accent: {
      success: '#30D158', // Apple system green — Promoted / PR
      warning: '#FFD60A', // Apple system yellow — caution / watch
      danger: '#FF453A', // Apple system red — fail / deload
      info: '#64D2FF', // Apple system teal — info / share
    },
    // Movement palette (Brand Lock V3) — one colour per tree / section.
    // Push doubles as brand primary; Legs doubles as success.
    movement: {
      push: '#FF6B1A',
      pull: '#64D2FF',
      core: '#BF5AF2',
      legs: '#30D158',
    },
    // Semantic state (aliased to accent for component code that reads these)
    danger: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    info: '#64D2FF',
    // Glass surfaces — for floating cards / sheets over content
    glass: {
      DEFAULT: 'rgba(28, 28, 30, 0.72)', // iOS systemGray6 with alpha
      'subtle': 'rgba(44, 44, 46, 0.6)', // slightly lighter, for inputs
      'heavy': 'rgba(20, 20, 22, 0.88)', // for modals / sheets
    },
    // DAG visualization — refined for dark immersive base
    dag: {
      'node-locked': '#3A3A3C', // locked — barely visible (de-emphasized)
      'node-unlocked': '#8E8E93', // unlocked — readable but not shouting
      'node-current': '#FF6B1A', // active — primary glow
      'node-promoted': '#30D158', // newly promoted — success green
      edge: 'rgba(255, 255, 255, 0.08)', // hairline edges
    },
    // Tendon strain (insights screen)
    tendon: {
      ok: '#30D158',
      watch: '#FFD60A',
      deload: '#FF453A',
    },
    // Gym-glare variant overrides (AAA contrast, pure black)
    'gym-glare': {
      bg: '#000000',
      fg: '#FFFFFF',
      'fg-muted': '#F5F5F7',
      primary: '#FF8A1F', // brighter orange, passes AAA on black
      border: 'rgba(255, 255, 255, 0.24)',
    },
  },

  font: {
    /** UI / body — Geist 400/500/600 with tabular figures (Brand Lock V3). */
    sans: "'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    /** Display — Saira variable (wdth axis), set condensed at 800 for headlines + big numbers. */
    display: "'Saira', 'Geist', system-ui, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
    /** Display weights. Saira display uses 800 (heavy) at a condensed width. */
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
      black: 900,
    },
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
    '9xl': '8rem', // 128px — hero / rep counter (NEW)
  },

  /** Line heights — controlled per size. Tighter on display, looser on body. */
  lineHeight: {
    display: '1.05', // sizes ≥ 5xl — hero display
    heading: '1.15', // sizes 2xl-4xl — section headings
    body: '1.5', // base body
    caption: '1.4', // xs / sm captions
  },

  /** Letter spacing — tighter on display, normal on body. */
  letterSpacing: {
    tightest: '-0.04em', // 8xl-9xl hero numerals
    display: '-0.02em', // Saira condensed display headlines (Brand Lock V3)
    tighter: '-0.022em', // 3xl-6xl headings
    tight: '-0.011em', // lg-xl body headings
    normal: '0', // body
    wide: '0.025em', // uppercase captions
    widest: '0.08em', // eyebrow text (Settings labels)
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
    sm: '0.5rem', // 8px — chips, small elements
    md: '0.875rem', // 14px — inputs, secondary cards
    lg: '1.25rem', // 20px — squircle (PRIMARY radius — cards, buttons, sheets)
    xl: '1.75rem', // 28px — hero cards, workout header
    '2xl': '2rem', // 32px — modals
    full: '9999px', // pills, rep counter
  },

  /** Blur — for backdrop-filter on glass surfaces. */
  blur: {
    none: '0',
    sm: '8px', // subtle blur for inputs / tooltips
    md: '20px', // primary blur for cards floating over content
    lg: '40px', // heavy blur for modals / sheets over scrolling content
  },

  shadow: {
    // Subtle elevation — Apple uses nearly-invisible shadows
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
    md: '0 4px 12px -2px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 12px 24px -8px rgb(0 0 0 / 0.6), 0 4px 8px -4px rgb(0 0 0 / 0.4)',
    // Active-node glow — softer, wider (was punchy 24px @ 0.45)
    glow: '0 0 40px 0 rgb(255 107 26 / 0.4), 0 0 80px 0 rgb(255 107 26 / 0.2)',
    // Glass surface shadow — subtle lift for floating glass
    glass: '0 8px 32px -8px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(255 255 255 / 0.04)',
  },

  motion: {
    // Apple-style timing — fast snappy taps, springy entries
    instant: '80ms', // tap feedback (press)
    micro: '150ms', // hover, small transitions
    ui: '250ms', // modal open/close, sheet
    page: '400ms', // route transitions
    spring: '500ms', // springy entry (cards animating in)
    // iOS-style easing curves
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)', // material-style out
    easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)', // material-style in
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // smooth in/out
    /** iOS spring — slight overshoot for tactile entry. */
    springOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    /** iOS sheet — slides from bottom, decelerates naturally. */
    sheetOut: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },

  /** Tap target floor — iOS HIG recommends 44pt minimum. */
  tapTarget: {
    base: '48px', // comfortable thumb reach
    gymGlare: '56px', // bigger for outdoor / sweaty hands
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