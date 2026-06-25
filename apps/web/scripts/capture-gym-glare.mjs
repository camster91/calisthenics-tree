#!/usr/bin/env node
/**
 * One-shot Playwright script — capture /wireframes/home in default and
 * gym-glare modes and write to apps/web/wireframes/screenshots/.
 *
 * Used for the a11y-verify task to confirm the gym-glare theme actually
 * changes the rendered output. Start a vite dev server in the
 * background before running this.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCREENSHOTS_DIR = resolve(ROOT, 'wireframes/screenshots');
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const PATH_UNDER_TEST = '/wireframes/home';

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    // Default prefers-contrast: no-preference — leave it absent so the
    // default theme applies.
  });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* private mode */
    }
  });

  const page = await ctx.newPage();
  console.log(`[capture] GET ${BASE_URL}${PATH_UNDER_TEST} (default theme)`);
  await page.goto(BASE_URL + PATH_UNDER_TEST, { waitUntil: 'load' });
  // Wait for the React tree + page header to be visible so the
  // screenshot doesn't capture a half-loaded state.
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root !== null && root.children.length > 0;
    },
    { timeout: 10_000 },
  );
  await page
    .getByRole('heading', { name: /Your three progressions/i })
    .waitFor({ timeout: 10_000 });

  const defaultPath = resolve(SCREENSHOTS_DIR, 'gym-glare-default.png');
  await page.screenshot({ path: defaultPath, fullPage: true });
  const defaultSize = statSync(defaultPath).size;
  console.log(`[capture] default screenshot → ${defaultPath} (${defaultSize} bytes)`);

  // Verify <html> has no data-theme attribute in default mode.
  const defaultThemeAttr = await page.evaluate(
    () => document.documentElement.getAttribute('data-theme'),
  );
  console.log(`[capture] default <html data-theme>=${defaultThemeAttr ?? '(none)'}`);

  // Force gym-glare by setting the data-theme attribute and letting
  // CSS variables repaint. We do this via JS evaluate so we don't have
  // to click the toggle on the layout (which doesn't exist on
  // /wireframes/home — that toggle lives on /settings).
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'gym-glare');
  });
  // Give the browser a tick to apply the new CSS variables.
  await page.waitForTimeout(150);

  const glarePath = resolve(SCREENSHOTS_DIR, 'gym-glare-on.png');
  await page.screenshot({ path: glarePath, fullPage: true });
  const glareSize = statSync(glarePath).size;
  console.log(`[capture] gym-glare screenshot → ${glarePath} (${glareSize} bytes)`);

  const glareThemeAttr = await page.evaluate(
    () => document.documentElement.getAttribute('data-theme'),
  );
  console.log(`[capture] gym-glare <html data-theme>=${glareThemeAttr ?? '(none)'}`);

  // Also sanity-check the CSS variables actually shifted.
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      surface: cs.getPropertyValue('--color-surface').trim(),
      fg: cs.getPropertyValue('--color-surface-fg').trim(),
      primary: cs.getPropertyValue('--color-primary').trim(),
      border: cs.getPropertyValue('--color-surface-border').trim(),
    };
  });
  console.log(`[capture] gym-glare tokens: ${JSON.stringify(tokens)}`);

  // Compare bytes.
  const diffBytes = Math.abs(defaultSize - glareSize);
  const diffPct = (diffBytes / defaultSize) * 100;
  console.log(
    `[capture] size diff = ${diffBytes} bytes (${diffPct.toFixed(2)}% of default)`,
  );
  const report = {
    baseUrl: BASE_URL,
    path: PATH_UNDER_TEST,
    default: { path: defaultPath, bytes: defaultSize, dataTheme: defaultThemeAttr },
    gymGlare: { path: glarePath, bytes: glareSize, dataTheme: glareThemeAttr },
    tokens,
    diffBytes,
    diffPct,
    pass: diffPct > 1.0,
  };
  const reportPath = resolve(SCREENSHOTS_DIR, 'gym-glare-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[capture] wrote ${reportPath}`);

  if (!report.pass) {
    console.error(
      `[capture] FAIL — gym-glare on screenshot differs from default by only ${diffPct.toFixed(2)}% (< 1%)`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[capture] PASS — gym-glare on screenshot differs from default by ${diffPct.toFixed(2)}% (> 1%)`,
    );
  }
} finally {
  await browser.close();
}
