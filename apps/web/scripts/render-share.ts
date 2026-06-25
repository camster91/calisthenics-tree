#!/usr/bin/env tsx
/**
 * render-share — rasterize the share card template to PNG via headless Chromium.
 *
 * T39 deliverable. Generates 3 variants (fresh / milestone / badge) for the
 * 3 unlock states from the spec. Output goes to `public/share/<unlockId>.png`
 * so Vite serves them as static files at `/share/<unlockId>.png`.
 *
 * Usage:
 *   npm run share:render           # render all 3 variants
 *   npm run share:render -- --dev  # render against the dev server (5173)
 *   npm run share:render -- --id tuck-front-lever-001  # one variant
 *
 * Why a separate script instead of an in-Vite middleware:
 *  - The build target is a static SPA. Adding a render-on-request server
 *    mid-build conflicts with the static-export model.
 *  - The FastAPI backend (Phase 1) will own the runtime `/api/v1/share/*.png`
 *    endpoint; this script produces the same PNG that endpoint will return.
 *    When the backend lands, wrap this function in a FastAPI route and the
 *    contract is preserved.
 *  - The PNGs are static, cacheable by Vercel/Caddy/CDN. The render cost
 *    is paid once per unlock-state, not per request.
 *
 * Verification: after running, `curl -sI http://localhost:5173/share/<id>.png`
 * should return 200 with `content-type: image/png` and a non-zero
 * content-length matching the saved file size.
 */
import { chromium } from 'playwright';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_SHARE = resolve(ROOT, 'public/share');

interface VariantSpec {
  unlockId: string;
  variant: 'fresh' | 'milestone' | 'badge';
  /** Human label for the log line. */
  label: string;
}

/**
 * 3 unlock states from the T39 spec.
 * Order matches the seed fixtures in src/pages/ShareRenderPage.tsx.
 */
const VARIANTS: VariantSpec[] = [
  { unlockId: 'tuck-front-lever-001', variant: 'fresh', label: 'fresh unlock' },
  { unlockId: 'tuck-front-lever-010', variant: 'milestone', label: 'milestone (10th skill)' },
  {
    unlockId: 'front-lever-tree-cleared',
    variant: 'badge',
    label: 'badge (tree cleared)',
  },
];

const BASE = (() => {
  if (process.env.SHARE_BASE_URL) return process.env.SHARE_BASE_URL;
  return process.argv.includes('--dev') ? 'http://localhost:5173' : 'http://localhost:4173';
})();
const IS_DEV = process.argv.includes('--dev');
const ONLY = (() => {
  const i = process.argv.indexOf('--id');
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function ensureServer() {
  // Quick liveness check — fail fast with a useful message if the server
  // isn't up. The `--dev` flag means "use the dev server on :5173" (handled
  // via the BASE default below). Otherwise we trust BASE / SHARE_BASE_URL.
  const res = await fetch(BASE).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(
      `No server detected at ${BASE}. Run \`npm run preview\` in another terminal, ` +
        `or \`npm run dev\` and pass --dev, or set SHARE_BASE_URL=http://localhost:5173.`,
    );
  }
}

async function renderOne(
  browser: import('playwright').Browser,
  spec: VariantSpec,
): Promise<{ path: string; bytes: number }> {
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 1200 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const url = `${BASE}/share/${spec.unlockId}?variant=${spec.variant}`;
  console.log(`[render-share] navigating ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

  // Wait for the share template to mount. The data-share-template attribute
  // is set on the root card div by UnlockShareCard.
  await page.waitForSelector('[data-share-template="unlock"]', { timeout: 10_000 });
  // Wait for fonts to be ready so the screenshot is stable.
  await page.evaluate(() => document.fonts.ready);
  // Small settle pass for any post-mount layout (e.g. flex baselines).
  await page.waitForTimeout(150);

  // Screenshot the card element only — not the page. This gives us a
  // pixel-perfect 1080x1080 PNG with no surrounding chrome.
  const card = await page.$('[data-share-template="unlock"]');
  if (!card) throw new Error(`Share card not found at ${url}`);

  const png = await card.screenshot({ type: 'png', omitBackground: false });

  // Save to public/share/<unlockId>.png. Vite serves /public at the root
  // so the file is also accessible at /share/<unlockId>.png at runtime.
  const outPath = resolve(PUBLIC_SHARE, `${spec.unlockId}.png`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  const bytes = statSync(outPath).size;

  await ctx.close();
  return { path: outPath, bytes };
}

async function main() {
  await ensureServer();
  mkdirSync(PUBLIC_SHARE, { recursive: true });

  const browser = await chromium.launch();
  try {
    const targets = ONLY ? VARIANTS.filter((v) => v.unlockId === ONLY) : VARIANTS;
    if (targets.length === 0) {
      throw new Error(
        `--id ${ONLY} didn't match any variant. Known: ${VARIANTS.map((v) => v.unlockId).join(', ')}`,
      );
    }
    const results: Array<{ unlockId: string; label: string; path: string; bytes: number }> = [];
    for (const spec of targets) {
      const { path, bytes } = await renderOne(browser, spec);
      results.push({ unlockId: spec.unlockId, label: spec.label, path, bytes });
      console.log(
        `[render-share] ${spec.label.padEnd(28)} ${path.replace(ROOT + '/', '')} (${bytes} bytes)`,
      );
    }
    console.log(`[render-share] rendered ${results.length} variant(s).`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[render-share] FAILED:', err.message ?? err);
  process.exit(1);
});
