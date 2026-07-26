import { expect, test } from '@playwright/test';
import { gotoLocale } from './support';

/**
 * Plan task 102 / spec §11.1: home page at three viewports × four locales. Beyond catching
 * unintended visual change, this is the regression net for the highest-risk integration in the
 * project (R-1): if Tailwind's Preflight is ever reintroduced, Material's controls lose their
 * styling and these snapshots fail loudly.
 */

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  for (const locale of ['en', 'es', 'fr', 'de']) {
    test(`home page — ${viewport.name} / ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoLocale(page, locale);

      // Carousels autoplay and would make snapshots flaky; pause animation before capturing.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`home-${viewport.name}-${locale}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      });
    });
  }
}

/**
 * Dropping Tailwind's Preflight (spec §5.3) means every reset it would have applied has to be
 * added back deliberately. Two were missed for links — colour, which axe-core caught as a contrast
 * failure, and `text-decoration`, which no automated check flags because an underline is not an
 * accessibility problem. It simply made the site look broken: the hero's call-to-action buttons,
 * the header wordmark and the phone numbers all rendered with a user-agent underline through them,
 * and the visual baselines were generated from that state, so they agreed with it.
 *
 * A pixel diff cannot catch a regression it was taught to expect, so this asserts the rule rather
 * than the picture.
 */
test('links are not underlined unless a utility asks for it (guards the missing Preflight resets)', async ({
  page,
}) => {
  await gotoLocale(page, 'en');

  const decorationOf = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).textDecorationLine);

  for (const selector of [
    'abc-top-contact-strip a',
    'abc-site-header nav a',
    'abc-site-header a[href$="#contact"]',
    'abc-hero-section a[href$="#pricing"]',
    'abc-hero-section a[href$="#how"]',
    'abc-site-footer a',
  ]) {
    expect(await decorationOf(selector), `${selector} should not be underlined`).toBe('none');
  }

  // ...and the inverse: a link that opts in still gets one, so the reset did not simply disable
  // underlines everywhere.
  await page.goto('/no-such-page');
  await expect(page.locator('abc-not-found-page a, main a').first()).toHaveCSS(
    'text-decoration-line',
    'underline',
  );
});

test('Material controls keep their styling alongside Tailwind (guards R-1)', async ({ page }) => {
  await gotoLocale(page, 'en');
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // A Material form field and a Material button rendered next to Tailwind-laid-out markup: the
  // exact combination spec §5.3 warns about.
  const formField = page.locator('abc-contact-section mat-form-field').first();
  await expect(formField).toBeVisible();
  await expect(formField).toHaveScreenshot('material-form-field.png', { maxDiffPixelRatio: 0.01 });

  const submit = page.getByTestId('enquiry-submit');
  await expect(submit).toHaveScreenshot('material-submit-button.png', { maxDiffPixelRatio: 0.01 });
});
