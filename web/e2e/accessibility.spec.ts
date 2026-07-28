import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { API_BASE, adminTokens, authHeaders, gotoLocale, signInBrowser } from './support';

/**
 * Plan task 101 / spec §6.2, §11.4: axe-core over every public route in all four locales and the
 * main CMS screens; the build fails on any serious or critical violation. Automated tooling
 * catches roughly a third of real accessibility defects, so §11.4's manual keyboard and
 * screen-reader pass per release still stands — this is the floor, not the ceiling.
 */

const BLOCKING = ['serious', 'critical'];

async function scan(page: import('@playwright/test').Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter((violation) => BLOCKING.includes(violation.impact ?? ''));
  const summary = blocking
    .map((violation) => `${violation.impact}: ${violation.id} — ${violation.help} (${violation.nodes.length} node(s))`)
    .join('\n');
  expect(blocking, `${context ?? 'page'} has blocking a11y violations:\n${summary}`).toEqual([]);
}

for (const locale of ['en', 'es', 'fr', 'de']) {
  test(`public site has no serious or critical a11y violations (${locale})`, async ({ page }) => {
    await gotoLocale(page, locale);
    await scan(page, `public /${locale}`);
  });
}

/** Task 141 — the careers page gets the same floor as every public route. */
for (const locale of ['en', 'es', 'fr', 'de']) {
  test(`the careers page has no serious or critical a11y violations (${locale})`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/careers' : `/${locale}/careers`);
    await expect(page.locator('[data-track]').first()).toBeVisible();
    await scan(page, `/${locale}/careers`);
  });
}

test('the careers FAQ accordion stays accessible once expanded', async ({ page }) => {
  await page.goto('/careers');
  await page.locator('abc-careers-faq mat-expansion-panel-header').first().click();
  await scan(page, '/careers with an open FAQ panel');
});

/**
 * WCAG 2.2 AA 3.1.2 (Language of Parts), which the scans above cannot reach: axe-core checks that
 * `lang` is present and well-formed, never that it describes the words underneath it.
 *
 * Careers copy is seeded English-only by decision (careers-plan.md D-5), so `/es/careers` is an
 * English page wearing a Spanish `lang`. A screen reader switches voice on that attribute, so
 * unmarked the track descriptions — the text an applicant most needs — are read with Spanish
 * pronunciation applied to English words.
 *
 * Asserted as a relationship rather than a constant: the day an editor translates a track the
 * server stops reporting `en`, the attribute disappears, and this test follows it instead of
 * failing.
 */
for (const locale of ['es', 'fr', 'de']) {
  test(`untranslated careers copy is marked with the language it is actually in (${locale})`, async ({ page }) => {
    const payload = page.waitForResponse((r) => r.url().includes('/content/careers'));
    await page.goto(`/${locale}/careers`);
    const served = (await (await payload).json()) as { contentLanguage: string };

    await expect(page.locator('html')).toHaveAttribute('lang', locale);

    const heading = page.locator('h1');
    const trackTitle = page.locator('[data-track] h3').first();
    const trackBlurb = page.locator('[data-track] p').first();

    if (served.contentLanguage === locale) {
      // Genuinely translated now — no attribute should be added, or it would mislabel the page.
      await expect(trackTitle).not.toHaveAttribute('lang', /./);
      return;
    }

    for (const element of [heading, trackTitle, trackBlurb]) {
      await expect(element).toHaveAttribute('lang', served.contentLanguage);
    }

    // The chrome around it is translated and must NOT be marked, which is the reason the attribute
    // sits on individual elements rather than on a wrapper around the whole page.
    await expect(page.locator('#careers-tracks-heading')).not.toHaveAttribute('lang', /./);
  });
}

test('the FAQ accordion stays accessible once expanded', async ({ page }) => {
  await gotoLocale(page, 'en');
  await page.locator('abc-faq-section mat-expansion-panel-header').first().click();
  await scan(page, 'public / with an open FAQ panel');
});

test('the skip link is the first focusable element and reaches main', async ({ page }) => {
  await gotoLocale(page, 'en');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('href', '#main');
});

test.describe('CMS screens', () => {
  test('login, dashboard and the content editor have no serious or critical violations', async ({ page, request }) => {
    await page.goto('/admin/login');
    await scan(page, '/admin/login');

    const tokens = await adminTokens(request);
    await signInBrowser(page, tokens);

    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await scan(page, '/admin dashboard');

    await page.goto('/admin/content/faqs');
    await expect(page.locator('h1')).toBeVisible();
    await scan(page, '/admin/content/faqs');

    // The editor is the CMS's densest screen — locale tabs, per-field controls, revision list —
    // so it earns its own scan rather than riding on the list page's clean bill.
    const faqs = await request.get(`${API_BASE}/admin/content/faqs`, { headers: authHeaders(tokens) });
    const [firstFaq] = (await faqs.json()) as Array<{ id: string }>;
    await page.goto(`/admin/content/faqs/${firstFaq.id}`);
    await expect(page.getByTestId('tab-es')).toBeVisible();
    await scan(page, '/admin/content/faqs/:id');

    await page.goto('/admin/translations');
    await expect(page.locator('h1')).toContainText('Translations');
    await scan(page, '/admin/translations');
  });
});
