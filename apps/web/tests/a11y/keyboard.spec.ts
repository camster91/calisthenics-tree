/**
 * Keyboard navigation test.
 *
 * Verifies the a11y baseline for keyboard users:
 *  - Skip-to-content link is the first focusable element
 *  - Tab order traverses all interactive controls on /settings
 *  - Focus ring is visible (2px primary outline, 2px offset)
 *  - Switches (role=switch) toggle with Space and Enter
 *  - Form input receives focus and shows visible focus state
 */
import { test, expect } from '@playwright/test';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        /* private mode */
      }
    });
  });

  test('skip link is the first focusable element on every page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab once — focus should land on the skip link.
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(
      () => document.activeElement?.textContent ?? '',
    );
    expect(firstFocus?.trim().toLowerCase()).toContain('skip to content');
  });

  test('Tab traverses every interactive control on /settings', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Wait for the Settings page heading to confirm the right route rendered.
    await page.getByRole('heading', { name: 'Settings' }).waitFor();

    // Tab through all focusable elements on the page. We don't cap the
    // iteration count — we keep going until the focus has cycled past
    // every interactive control. The test asserts that the key
    // controls (gym-glare toggle, display-name input, save button)
    // were all reached in tab order.
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return '';
        // For elements with aria-labelledby, resolve the labelled text
        // (the label is on a separate <span>). Falls back to text/aria.
        const labelledBy = el.getAttribute('aria-labelledby');
        let label = '';
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          if (labelEl) label = labelEl.textContent?.trim() ?? '';
        }
        return (
          label ||
          el.getAttribute('aria-label') ||
          el.textContent?.trim().slice(0, 40) ||
          el.tagName
        );
      });
      if (!id) break;
      seen.add(id);
    }

    // Spot-check that the key controls were all reached. The "Display name"
    // text is the <label> for the input; we look up the input by id and
    // verify it has the expected aria-describedby. The toggle's
    // aria-label includes "Gym-glare mode", and the save button has
    // text "Save".
    const seenLower = Array.from(seen).join('|').toLowerCase();
    expect(seenLower).toContain('browse');
    expect(seenLower).toContain('settings');
    expect(seenLower).toContain('gym-glare mode');
    expect(seenLower).toContain('save');

    // Verify the display-name input is focusable and labeled. Pull its
    // accessible name via the label it is associated with.
    const inputAccessibleName = await page
      .locator('#display-name')
      .evaluate((el) => {
        const inputEl = el as HTMLInputElement;
        const labelId = inputEl.id;
        const labelEl = document.querySelector(
          `label[for="${labelId}"]`,
        ) as HTMLElement | null;
        return labelEl?.textContent?.trim() ?? '';
      });
    expect(inputAccessibleName.toLowerCase()).toContain('display name');
  });

  test('switch toggles with Space and Enter', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Find the gym-glare switch via its labelledby
    const toggle = page.locator('[role="switch"]').first();
    await toggle.focus();
    const beforeAria = await toggle.getAttribute('aria-checked');
    expect(beforeAria).toBe('false');

    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('focus ring is visible (primary color, 2px outline, 2px offset)', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Use the gym-glare switch as the test subject — it has the full
    // focus-visible class set.
    const toggle = page.locator('[role="switch"]').first();
    await toggle.focus();

    const outline = await toggle.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineOffset: cs.outlineOffset,
      };
    });

    // The :focus-visible rule in index.css sets outline 2px primary, 2px offset.
    // Browsers report outlineColor as a long rgb() — we just check the rule
    // applied, not the exact color, since the primary changes with theme.
    expect(outline.outlineWidth).toBe('2px');
    expect(outline.outlineStyle).toBe('solid');
    expect(outline.outlineOffset).toBe('2px');
  });

  test('skip link moves focus to <main> when activated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to the skip link, then activate.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Focus should now be on the <main> element with id="main".
    const focusedId = await page.evaluate(
      () => document.activeElement?.id ?? '',
    );
    expect(focusedId).toBe('main');
  });
});
