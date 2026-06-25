#!/usr/bin/env node
/**
 * Standalone theme CSS generator — for CI / pre-build / pre-commit.
 *
 * Mirrors what the Vite dev plugin does (`vite/plugin-theme.ts`) but runs
 * in pure Node so it can be wired into `npm run build` BEFORE `tsc` /
 * `vite build` runs. Without this, a fresh clone (no `.generated/theme.css`)
 * would build CSS that @imports a missing file and the dev server boot
 * would silently lack the @theme block.
 *
 * Run via: `npm run theme:build`
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedPath = resolve(__dirname, '../src/.generated/theme.css');

// Use the same TS file the Vite plugin imports. tsx handles the TS->ESM bridge.
const { buildThemeCss } = await import(
  pathToFileURL(resolve(__dirname, '../src/lib/build-theme.ts')).href
);

mkdirSync(dirname(generatedPath), { recursive: true });
writeFileSync(generatedPath, buildThemeCss(), 'utf8');

console.log(
  `[theme:build] wrote ${generatedPath} (${
    existsSync(generatedPath) ? 'ok' : 'missing'
  })`,
);
