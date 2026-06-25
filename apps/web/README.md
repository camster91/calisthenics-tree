# Calisthenics Tree — Web

Vite 8 + React 19 + TypeScript 6 + Tailwind v4 SPA. Phase 1.5 of the calisthenics-platform monorepo.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # theme:build + tsc -b + vite build
npm run verify:tokens  # WCAG AA / AAA contrast check
```

## Architecture

- **Single source of truth for design tokens:** `src/tokens.ts`. Edit a value there; the CSS rebuilds.
- **Generator:** `src/lib/build-theme.ts` converts `tokens.ts` → `src/.generated/theme.css` (`@theme { ... }` block + gym-glare override block).
- **Vite plugin:** `vite/plugin-theme.ts` regenerates the CSS on dev server start and on `tokens.ts` change (HMR).
- **CI entry:** `scripts/build-theme.mjs` (run via `npm run theme:build`) and `scripts/verify-contrast.mjs` (run via `npm run verify:tokens`).
- **Theme hook:** `src/lib/theme.ts` — toggles between `default` (dark) and `gym-glare` (high-contrast). Reads localStorage `ct:theme`, falls back to `window.matchMedia('(prefers-contrast: more)')`.

## Adding a new token

1. Add the value to `src/tokens.ts` (semantic name, not a raw color).
2. Run `npm run theme:build` (or just save — the Vite plugin handles it in dev).
3. Use the Tailwind utility: `bg-<group>`, `text-<group>`, `bg-<group>-<subkey>`, etc.

Example: `--color-surface` is the default `bg-surface`; `--color-surface-fg-muted` becomes `text-surface-fg-muted`.

## Tailwind v4 + tokens

Tailwind v4 has no `tailwind.config.{js,ts}` — the theme lives in CSS via `@theme { ... }`. The generator bridges the gap so we still get a TypeScript source of truth that components can import for runtime use (e.g. `tokens.color.surface.bg` in a styled component).

## Verification

- `npm run verify:tokens` — checks 21 foreground/background pairs against WCAG 2.1 AA (4.5:1 body / 3:1 large) for the default theme and AAA (7:1) for gym-glare. Exits non-zero on failure; run in CI.
- `npm run build` — `theme:build` runs first, then `tsc -b` and `vite build`. If the generated CSS is stale, the build fails.
- `@axe-core/playwright` tests live under `tests/` (T38).

## Layout

```
apps/web/
  src/
    tokens.ts              # single source of truth
    lib/
      build-theme.ts       # tokens → CSS generator
      theme.ts             # gym-glare hook
      cn.ts                # clsx + tailwind-merge
      api.ts               # typed fetch wrapper
    .generated/
      theme.css            # AUTO-GENERATED, gitignored
    components/
      ui/                  # shadcn-style primitives
      layout/
      workout/
    pages/
    index.css              # @import './.generated/theme.css' + base + components
    main.tsx
    App.tsx
  vite/
    plugin-theme.ts        # dev server theme regeneration
  scripts/
    build-theme.mjs        # CI theme generator
    verify-contrast.mjs    # WCAG verifier
  vite.config.ts
```
