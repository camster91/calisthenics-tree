/**
 * Playwright screenshot harness — T37 wireframes.
 *
 * Visits every wireframe route at desktop (1280x800) and mobile (375x812),
 * captures a PNG, and writes a JSON manifest with any console errors.
 * Run with: node scripts/screenshot-wireframes.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.WIREFRAME_BASE || 'http://localhost:5173';
const OUT_DIR = path.resolve('apps/web/wireframes/screenshots');

const ROUTES = [
  ['landing', '/wireframes/landing'],
  ['login', '/wireframes/login'],
  ['login-error', '/wireframes/login?state=error'],
  ['onboarding-q1', '/wireframes/onboarding-q1'],
  ['onboarding-q2', '/wireframes/onboarding-q2'],
  ['onboarding-q3', '/wireframes/onboarding-q3'],
  ['onboarding-test-empty', '/wireframes/onboarding-test'],
  ['onboarding-test-loading', '/wireframes/onboarding-test?state=loading'],
  ['onboarding-test-success', '/wireframes/onboarding-test?state=success'],
  ['onboarding-result', '/wireframes/onboarding-result'],
  ['home', '/wireframes/home'],
  ['home-empty', '/wireframes/home?state=empty'],
  ['home-loading', '/wireframes/home?state=loading'],
  ['home-error', '/wireframes/home?state=error'],
  ['workout-log', '/wireframes/workout-log'],
  ['workout-log-empty', '/wireframes/workout-log?state=empty'],
  ['workout-log-loading', '/wireframes/workout-log?state=loading'],
  ['workout-done', '/wireframes/workout-done'],
  ['feed', '/wireframes/feed'],
  ['feed-empty', '/wireframes/feed?state=empty'],
  ['friend-profile', '/wireframes/friend-profile'],
  ['tendon-insight', '/wireframes/tendon-insight'],
  ['settings', '/wireframes/settings'],
  ['paywall', '/wireframes/paywall'],
  ['subscription', '/wireframes/subscription'],
  ['subscription-empty', '/wireframes/subscription?state=empty'],
  ['empty-states', '/wireframes/empty-states'],
  ['index', '/wireframes'],
];

const VIEWPORTS = [
  ['desktop', { width: 1280, height: 800 }],
  ['mobile', { width: 375, height: 812 }],
];

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const manifest = [];

  for (const [vpName, vp] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    for (const [name, route] of ROUTES) {
      const url = `${BASE}${route}`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(400); // settle animations
        const file = path.join(OUT_DIR, `${vpName}-${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        manifest.push({
          viewport: vpName,
          name,
          route,
          file,
          http: resp?.status() ?? 0,
          consoleErrors: consoleErrors.length,
        });
        console.log(`  ${vpName.padEnd(7)} ${name.padEnd(28)} ${resp?.status() ?? '???'}`);
        consoleErrors.length = 0;
      } catch (err) {
        console.log(`  ${vpName.padEnd(7)} ${name.padEnd(28)} ERROR: ${err.message}`);
        manifest.push({
          viewport: vpName,
          name,
          route,
          error: err.message,
        });
      }
    }
    await ctx.close();
  }

  await browser.close();
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  const ok = manifest.filter((m) => !m.error).length;
  const total = manifest.length;
  console.log(`\n${ok}/${total} screenshots captured.`);
  if (ok !== total) {
    for (const m of manifest.filter((m) => m.error)) {
      console.log(`  FAIL: ${m.viewport} ${m.name} → ${m.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});