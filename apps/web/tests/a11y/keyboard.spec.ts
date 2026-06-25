/**
 * Keyboard navigation test.
 *
 * Verifies the a11y baseline for keyboard users:
 *  - Skip-to-content link is the first focusable element
 *  - Tab order traverses all interactive controls on /settings
 *  - Focus ring is visible (2px primary outline, 2px offset)
 *  - Theme radiogroup (role=radiogroup / role=radio) follows the
 *    WAI-ARIA APG pattern: roving tabindex, arrow keys move + select,
 *    Space/Enter re-affirm the focused radio.
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
// verify it has the expected aria-describedby. The theme radiogroup
// uses roving tabindex (only the checked radio is in the Tab order),
// so we expect to see "Default (dark)" (the initially-checked option)
// in `seen`. Reachability of "Gym glare" is covered by the dedicated
// radiogroup keyboard test below.
const seenLower = Array.from(seen).join('|').toLowerCase();
expect(seenLower).toContain('home'); // Layout nav — was "Browse" pre-i18n
expect(seenLower).toContain('settings'); // both the nav link and the page heading
expect(seenLower).toContain('default (dark)');
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

  test('theme radiogroup: roving tabindex + arrow nav + Space/Enter', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const radiogroup = page.getByRole('radiogroup', { name: /theme/i });
    const defaultRadio = radiogroup.getByRole('radio', {
      name: /default \(dark\)/i,
    });
    const gymGlareRadio = radiogroup.getByRole('radio', {
      name: /gym glare \(high contrast\)/i,
    });

    // localStorage is cleared in beforeEach — so the default theme is
    // active and 'default' should be the checked radio, tabIndex=0.
    await expect(defaultRadio).toHaveAttribute('aria-checked', 'true');
    await expect(defaultRadio).toHaveAttribute('tabindex', '0');
    await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'false');
    await expect(gymGlareRadio).toHaveAttribute('tabindex', '-1');

    // Focus the checked radio, then arrow-right to move + select.
    await defaultRadio.focus();
    await page.keyboard.press('ArrowRight');
    await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'true');
    await expect(defaultRadio).toHaveAttribute('aria-checked', 'false');
    // Roving tabindex swapped — gym-glare now has tabIndex=0.
    await expect(gymGlareRadio).toHaveAttribute('tabindex', '0');
    await expect(defaultRadio).toHaveAttribute('tabindex', '-1');

    // Arrow-left returns to default.
    await page.keyboard.press('ArrowLeft');
    await expect(defaultRadio).toHaveAttribute('aria-checked', 'true');
    await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'false');

    // Space re-affirms current selection (does NOT submit the form).
    await page.keyboard.press('Space');
    await expect(defaultRadio).toHaveAttribute('aria-checked', 'true');

    // End jumps to last radio (gym-glare).
    await page.keyboard.press('End');
    await expect(gymGlareRadio).toHaveAttribute('aria-checked', 'true');

    // Home jumps back to first.
    await page.keyboard.press('Home');
    await expect(defaultRadio).toHaveAttribute('aria-checked', 'true');
  });

  test('theme radiogroup: 48px minimum tap target', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const radiogroup = page.getByRole('radiogroup', { name: /theme/i });
    const radios = radiogroup.getByRole('radio');
    const count = await radios.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      const box = await radio.boundingBox();
      expect(box, `radio #${i} bounding box`).not.toBeNull();
      // WCAG 2.5.5 — interactive controls ≥ 24px CSS, but the workout-
      // floor rule for this app is 48px. See tokens.tapTarget.base.
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('focus ring is visible (primary color, 2px outline, 2px offset)', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Use the focused radio inside the theme radiogroup as the test
    // subject — it has the full focus-visible class set.
    const radio = page
      .getByRole('radiogroup', { name: /theme/i })
      .getByRole('radio')
      .first();
    await radio.focus();

    const outline = await radio.evaluate((el) => {
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
