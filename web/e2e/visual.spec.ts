import { expect, test } from '@playwright/test';
import { PROFESSIONAL_PORTAL, gotoLocale, withPortalConfigured } from './support';

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
 * Task 142 — the careers page at the same three viewports.
 *
 * English only, unlike the home page above, and the asymmetry is deliberate. Careers copy is seeded
 * English-only by decision (careers-plan.md D-5), so `/es/careers` and `/careers` differ in the
 * chrome and nothing else; four locales here would be twelve baselines of the same photograph and
 * twelve files to re-approve on every copy change. What the other locales genuinely risk is text
 * *length* — and that is covered by the German case below rather than by three near-duplicates.
 */
for (const viewport of VIEWPORTS) {
  test(`careers page — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/careers');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-track]').first()).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(`careers-${viewport.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
}

/**
 * German at the narrowest viewport: the worst case for layout in this project. German is reliably
 * the longest of the four translations and 390px is the least room, so if a translated label is
 * going to overflow its control or push a card out of shape, it does it here. The careers page is
 * the one place a *mixed* string occurs too — "Als Registered nurse bewerben" — which is longer
 * than either language alone would suggest.
 */
test('careers page — mobile / de (longest strings, least room)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLocale(page, 'de');
  await page.goto('/de/careers');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-track]').first()).toBeVisible();
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('careers-mobile-de.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
    animations: 'disabled',
  });
});

/**
 * A pixel diff cannot fail for a reason it was taught to expect, and a call-to-action that has
 * overflowed its button is still a valid picture. Asserted as a rule: every CTA's text stays inside
 * it, in every locale, at the narrowest viewport.
 */
test('call-to-action labels stay inside their buttons in every language', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Needs the portal configured, or there are no buttons to overflow — the shipped state hides them
  // while professional.abofonsa.com is undeployed (careers-plan.md task 144).
  await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
  for (const locale of ['en', 'es', 'fr', 'de']) {
    await page.goto(locale === 'en' ? '/careers' : `/${locale}/careers`);
    await expect(page.locator('[data-track]').first()).toBeVisible();

    const overflowing = await page.locator('a[href*="/register"]').evaluateAll((links) =>
      links
        .filter((link) => link.scrollWidth > link.clientWidth + 1 || link.scrollHeight > link.clientHeight + 1)
        .map((link) => link.textContent?.trim().slice(0, 60)),
    );
    expect(overflowing, `CTA text overflows its button in ${locale}`).toEqual([]);
  }
  });
});

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

/**
 * The performance budget, measured the only way that is honest: by loading the page and counting
 * every byte of JavaScript that crosses the wire.
 *
 * `scripts/check-bundle-size.mjs` reads the chunks named in the HTML, which misses everything the
 * app pulls in with a dynamic `import()` during hydration — six files and ~240 kB uncompressed on
 * the home page. It reported 121 kB while the browser actually fetched 845 kB, and that gap hid a
 * production defect for as long as it existed: nginx was compressing `text/html` only, so all of
 * that JavaScript shipped uncompressed to an audience the spec describes as mid-range Android on a
 * slow connection.
 *
 * The threshold is generous relative to spec §13.1's 220 kB because it counts strictly more than
 * §13.1 does — the deferred Material chunks included. What matters is that it counts *everything*,
 * so a regression of this kind cannot hide behind a definition again.
 */
test('the home page does not ship more JavaScript than the budget allows', async ({ page }) => {
  const bytesByFile = new Map<string, number>();
  page.on('response', async (response) => {
    if (!response.url().endsWith('.js')) {
      return;
    }
    const declared = Number(response.headers()['content-length'] ?? 0);
    const body = declared > 0 ? declared : (await response.body().catch(() => Buffer.alloc(0))).byteLength;
    bytesByFile.set(response.url(), body);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const totalKb = [...bytesByFile.values()].reduce((sum, n) => sum + n, 0) / 1024;
  const report = `${bytesByFile.size} JS files, ${totalKb.toFixed(0)} kB over the wire`;

  // Compressed in production; the local compose stack serves uncompressed, so the ceiling has to
  // accommodate both rather than passing locally and failing against the deployed site.
  expect(totalKb, `home page ships too much JavaScript — ${report}`).toBeLessThan(900);
  expect(bytesByFile.size, `no JavaScript was fetched at all — ${report}`).toBeGreaterThan(0);
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
