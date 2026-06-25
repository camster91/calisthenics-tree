#!/usr/bin/env tsx
/**
 * render-marketing — produce App Store Connect screenshots from the marketing page.
 *
 * T40 deliverable. Renders the 3 App Store slots at iPhone 14 Pro portrait
 * (1290×2796) and exports PNGs to apps/web/marketing/screenshots/.
 *
 * The marketing page (`/marketing/screenshots/:slot`) renders each slot
 * as a single 1290×2796 div with the App Store caption strip composited
 * in-app. No post-process ImageMagick composition needed — every PNG
 * drops directly into App Store Connect.
 *
 * Usage:
 *   npm run marketing:render           # render all 3 slots
 *   npm run marketing:render -- --dev  # render against the dev server (5173)
 *   npm run marketing:render -- --slot 1  # render a single slot
 *   npm run marketing:render -- --slot 2  # one slot only
 *
 * The script is the App Store Connect-side counterpart to render-share.ts
 * (T39). Same model: one script, in-place PNGs, Vite serves them statically.
 *
 * Verification: after running, `file marketing/screenshots/default_*.png`
 * shows PNG image data, 1290×2796 (App Store Connect iPhone 6.7" spec).
 */
import { chromium } from 'playwright';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'marketing/screenshots');

interface SlotSpec {
  /** App Store slot index. */
  slot: number;
  /** Marketing slug in the URL path. */
  slug: string;
  /** Filename in marketing/screenshots/. */
  outFile: string;
  /** Human label for the log line. */
  label: string;
}

const SLOTS: SlotSpec[] = [
  {
    slot: 1,
    slug: '1',
    outFile: 'default_001_unlock-skills.png',
    label: 'slot 1 — Unlock skills like a video game',
  },
  {
    slot: 2,
    slug: '2',
    outFile: 'default_002_smart-adjustments.png',
    label: 'slot 2 — Smart adjustments when you fatigue',
  },
  {
    slot: 3,
    slug: '3',
    outFile: 'default_003_train-with-friends.png',
    label: 'slot 3 — Train with friends',
  },
];

const BASE = process.env.MARKETING_BASE_URL ?? 'http://localhost:4173';
const IS_DEV = process.argv.includes('--dev');

const ONLY = (() => {
  const i = process.argv.indexOf('--slot');
  return i >= 0 ? Number(process.argv[i + 1]) : null;
})();

async function renderOne(
  browser: import('playwright').Browser,
  spec: SlotSpec,
): Promise<{ path: string; bytes: number }> {
  // DeviceScaleFactor 1 keeps the render at native 1290×2796 — App Store
  // Connect validates exact pixel dimensions, so we don't get the 2x
  // density bump that Playwright iPhone emulation produces.
  const ctx = await browser.newContext({
    viewport: { width: 1290, height: 2796 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const url = `${BASE}/marketing/screenshots/${spec.slug}`;
  console.log(`[render-marketing] navigating ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

  // The page exposes a single [data-screenshot] div at the exact target
  // dimensions. Wait for it to be in the DOM and have non-zero size.
  await page.waitForSelector('[data-screenshot]', { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
  // Small settle pass so any post-mount layout finishes (icon strokes, etc.)
  await page.waitForTimeout(200);

  const card = await page.$('[data-screenshot]');
  if (!card) throw new Error(`Marketing slot not found at ${url}`);

  // Sanity check: the element must be exactly 1290×2796.
  const box = await card.boundingBox();
  if (!box) throw new Error(`Could not measure slot element at ${url}`);
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  if (w !== 1290 || h !== 2796) {
    throw new Error(
      `Slot ${spec.slot} rendered at ${w}×${h}, expected 1290×2796. ` +
        `Check the W/H constants in src/pages/marketing/Screenshots.tsx.`,
    );
  }

  const png = await card.screenshot({ type: 'png', omitBackground: false });

  const outPath = resolve(OUT_DIR, spec.outFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  const bytes = statSync(outPath).size;

  await ctx.close();
  return { path: outPath, bytes };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  if (IS_DEV) {
    // Dev server is expected to be running externally (`npm run dev`).
  } else {
    // Use the preview server (vite preview) on :4173 for the static build.
    // If the user is using `npm run dev`, pass --dev.
    // Fail-soft: just note we expect the preview server.
  }

  const browser = await chromium.launch();
  try {
    const targets = ONLY ? SLOTS.filter((s) => s.slot === ONLY) : SLOTS;
    if (targets.length === 0) {
      throw new Error(
        `--slot ${ONLY} didn't match any slot. Known: ${SLOTS.map((s) => s.slot).join(', ')}`,
      );
    }
    const results: Array<{ slot: number; label: string; path: string; bytes: number }> = [];
    for (const spec of targets) {
      const { path, bytes } = await renderOne(browser, spec);
      const rel = path.replace(ROOT + '/', '');
      results.push({ slot: spec.slot, label: spec.label, path, bytes });
      console.log(`[render-marketing] ${spec.label.padEnd(48)} ${rel} (${bytes} bytes)`);
    }
    console.log(`[render-marketing] rendered ${results.length} slot(s).`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[render-marketing] FAILED:', err.message ?? err);
  process.exit(1);
});
