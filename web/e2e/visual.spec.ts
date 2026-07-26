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
