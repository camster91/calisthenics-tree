/**
 * Vite plugin: generate `src/.generated/theme.css` from `src/tokens.ts` on
 * dev server start and on tokens.ts change. The generated file is imported
 * by `src/index.css` so Tailwind v4 picks up the @theme block.
 *
 * Why this exists: Tailwind v4 has no `tailwind.config.{js,ts}` — the theme
 * lives in CSS via `@theme { ... }`. To keep `tokens.ts` as the single
 * source of truth, this plugin regenerates the CSS file whenever tokens
 * change.
 *
 * Run standalone via `node --experimental-strip-types scripts/build-theme.mjs`
 * for CI builds.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the generated CSS file (relative to apps/web root). */
const generatedPath = resolve(__dirname, '../src/.generated/theme.css');

/**
 * Import tokens.ts and build the CSS string. The dynamic import uses
 * `data:` URLs with `?import` so Vite treats it as a TS module even when
 * we're running this in Node-only contexts (the build script imports
 * the same module via tsx).
 */
async function generateThemeCss(): Promise<string> {
  // Direct import — Vite will transform .ts. Works at build time and in
  // the dev server. For a pure-Node CI run, scripts/build-theme.mjs uses
  // tsx to load the same module.
  const { buildThemeCss } = await import('../src/lib/build-theme.ts');
  return buildThemeCss();
}

export function themeTokensPlugin(): Plugin {
  return {
    name: 'calisthenics-tree:theme-tokens',
    enforce: 'pre',

    async configResolved() {
      const css = await generateThemeCss();
      mkdirSync(dirname(generatedPath), { recursive: true });
      writeFileSync(generatedPath, css, 'utf8');
    },

    // Watch src/tokens.ts + src/lib/build-theme.ts — when they change,
    // regenerate theme.css and let Vite HMR pick it up.
    handleHotUpdate({ file, server }) {
      const watchList = [
        resolve(__dirname, '../src/tokens.ts'),
        resolve(__dirname, '../src/lib/build-theme.ts'),
      ];
      if (!watchList.includes(file)) return;

      // Regenerate the CSS file synchronously
      void (async () => {
        try {
          const css = await generateThemeCss();
          writeFileSync(generatedPath, css, 'utf8');
          // Invalidate any modules that import the generated CSS so HMR
          // reloads the styles.
          const mod = server.moduleGraph.getModuleById(generatedPath);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: 'full-reload' });
          }
        } catch (err) {
          server.config.logger.error(`[theme-tokens] regen failed: ${err}`);
        }
      })();
    },
  };
}
