/**
 * Accessibility audit — axe-core via @axe-core/playwright.
 *
 * Verifies the WCAG AA baseline on every Phase 1.5 wireframe screen.
 * Tests run against the dev server, with a fresh localStorage to
 * keep theme auto-detect deterministic.
 *
 * Tags: WCAG 2.1 AA, 2.4.6 (Headings and Labels),
 *       1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SCREENS: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'settings', path: '/settings' },
];

for (const screen of SCREENS) {
  test(`axe-core: ${screen.name} has no WCAG AA violations`, async ({
    page,
  }) => {
    // Reset theme + localStorage so axe sees the default state.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        /* private mode — ignore */
      }
    });

    await page.goto(screen.path, { waitUntil: 'load' });
    // Wait for fonts + the React tree to actually mount. The dev server
    // emits a full-reload HMR boundary whenever tokens.ts changes, so
    // we don't rely on networkidle (it never settles in HMR mode).
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return root !== null && root.children.length > 0;
      },
      { timeout: 10_000 },
    );
    // Best-effort wait for web fonts. Skip if the dev server is doing
    // an HMR full-reload — the navigation tears down the context and
    // we don't want axe to fail because of dev-mode churn.
    try {
      await Promise.race([
        page.evaluate(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    } catch {
      /* navigation interrupted — fine, axe will run anyway */
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations.length > 0) {
      // Print a structured summary so the failure is debuggable
      // without opening the HTML report.
      const summary = results.violations
        .map((v) => {
          const nodeSummaries = v.nodes
            .map(
              (n) =>
                `    • ${n.target.join(' ')} — ${n.failureSummary?.replace(/\n/g, ' ').slice(0, 200) ?? ''}`,
            )
            .join('\n');
          return `[${v.impact ?? 'unknown'}] ${v.id} (${v.nodes.length} nodes): ${v.help}\n${nodeSummaries}`;
        })
        .join('\n\n');
      throw new Error(
        `axe-core found ${results.violations.length} violation(s) on ${screen.name}:\n\n${summary}`,
      );
    }

    expect(results.violations).toEqual([]);
  });
}
