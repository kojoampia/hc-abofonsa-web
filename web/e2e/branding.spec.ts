import { expect, test } from '@playwright/test';
import { gotoLocale } from './support';

/**
 * The brand marks actually render.
 *
 * Both halves of this shipped wrong and nothing noticed, for related reasons:
 *
 * - the header had no logo at all, only a text wordmark — an omission no assertion can catch,
 *   because nothing was broken, it simply was not there;
 * - `favicon.ico` was Angular's stock icon, so the tab showed the generator's mark on an Abofonsa
 *   site. A status check would have passed: the file was present, just not ours.
 *
 * The trap for anyone extending this: **a missing static file does not 404 here.** The SSR server's
 * catch-all renders the not-found page with HTTP 200, so `/apple-touch-icon.png` returned 200 with
 * `text/html` while not existing. Every assertion below therefore checks the content type, and the
 * image assertions check decoded pixels rather than the response — an `<img>` pointing at an HTML
 * error page still "loads" as far as the network is concerned.
 */

test('the header shows the logo, and it actually decodes', async ({ page }) => {
  await gotoLocale(page, 'en');
  const logo = page.locator('abc-site-header img').first();
  await expect(logo).toBeVisible();

  // naturalWidth is the honest check: it is 0 for a src that resolved to HTML, a 404 page, or a
  // corrupt file, all of which still produce a "successful" response and a visible element.
  const decoded = await logo.evaluate((img) => ({
    naturalWidth: (img as HTMLImageElement).naturalWidth,
    naturalHeight: (img as HTMLImageElement).naturalHeight,
  }));
  expect(decoded.naturalWidth, 'the logo did not decode — check the file, not the status code').toBeGreaterThan(0);
  expect(decoded.naturalHeight).toBeGreaterThan(0);

  // Sized in the markup so the header does not reflow around it while it loads.
  await expect(logo).toHaveAttribute('width', '40');
  await expect(logo).toHaveAttribute('height', '40');
});

/**
 * The badge already reads "Abofonsa BridgeCare", the link repeats it as text, and the link carries
 * an aria-label. Naming the image too would make a screen reader say it three times for one control.
 */
test('the logo is not announced separately from the wordmark it duplicates', async ({ page }) => {
  await gotoLocale(page, 'en');
  const logo = page.locator('abc-site-header img').first();
  await expect(logo).toHaveAttribute('alt', '');
  await expect(logo).toHaveAttribute('aria-hidden', 'true');

  const link = page.locator('abc-site-header a[href="#top"]').first();
  await expect(link).toHaveAttribute('aria-label', /Abofonsa/i);
});

/**
 * Every icon the document asks for exists and is an image.
 *
 * Driven from the `<link>` tags rather than a hardcoded list, so adding a tag without adding the
 * file fails here instead of in someone's browser tab.
 */
test('every declared icon is served as an image, not as the not-found page', async ({ page, request }) => {
  await gotoLocale(page, 'en');

  const hrefs = await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').evaluateAll((links) =>
    links.map((l) => (l as HTMLLinkElement).getAttribute('href')!),
  );
  expect(hrefs.length, 'the document declares no icons at all').toBeGreaterThanOrEqual(5);

  for (const href of hrefs) {
    const response = await request.get(`/${href.replace(/^\//, '')}`);
    expect(response.status(), `${href} was not served`).toBe(200);
    // The SSR catch-all answers 200 with text/html for anything missing, so the status proves
    // nothing on its own — this is the assertion that would have caught the absent files.
    expect(response.headers()['content-type'], `${href} is not an image — it is the SSR fallback`).toMatch(
      /^image\//,
    );
    expect((await response.body()).byteLength, `${href} is empty`).toBeGreaterThan(100);
  }
});

/**
 * The icons are the Abofonsa badge, not the framework's default. Angular's stock `favicon.ico` is
 * 15086 bytes; ours is generated from the brand logo and is materially smaller. Asserting "not that
 * exact artefact" is cruder than comparing pixels, but it pins the specific regression that
 * happened — a generator default surviving into production.
 */
test('the favicon is the brand mark rather than the framework default', async ({ request }) => {
  const ico = await request.get('/favicon.ico');
  expect(ico.headers()['content-type']).toMatch(/^image\//);
  expect((await ico.body()).byteLength, "this is Angular's stock favicon.ico").not.toBe(15086);

  const png = await request.get('/favicon-32x32.png');
  expect(png.headers()['content-type']).toMatch(/^image\/png/);
  // PNG magic number — proves a real PNG rather than an HTML page served with a hopeful name.
  expect((await png.body()).subarray(0, 4).toString('hex')).toBe('89504e47');
});

/**
 * The page never scrolls sideways, at the narrowest supported width, in any language.
 *
 * Added because adding the header logo broke exactly this and nothing failed. At 390px the header
 * had no slack at all — production measured `scrollWidth` 390 against a 390 viewport — so a 40px
 * mark plus its gap pushed the layout to 484px, moving the language chooser's last two codes and
 * the menu button off-screen. The visual baselines could not catch it: `toHaveScreenshot` captures
 * the viewport-width page, so content pushed beyond the right edge is simply not in the picture.
 *
 * German is the longest of the four translations, so it is the one most likely to reintroduce this.
 */
for (const locale of ['en', 'es', 'fr', 'de']) {
  test(`the page does not scroll horizontally at 390px (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLocale(page, locale);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `page overflows by ${scrollWidth - clientWidth}px in ${locale}`).toBeLessThanOrEqual(
      clientWidth,
    );

    // ...and specifically that the controls people need are still reachable.
    for (const control of ['abc-language-switcher button', 'abc-site-header button']) {
      const last = page.locator(control).last();
      const box = await last.boundingBox();
      expect(box, `${control} has no box in ${locale}`).not.toBeNull();
      expect(box!.x + box!.width, `${control} is off-screen in ${locale}`).toBeLessThanOrEqual(clientWidth);
    }
  });
}

/**
 * Unknown URLs answer 404, not 200 (careers-plan.md task 146).
 *
 * Every unrecognised path used to be served with HTTP 200 and the not-found page — a soft 404. No
 * user notices; a crawler does. It indexes each typo, stale link and probe as a real page and then
 * reads the site as full of thin duplicates. Invisible today only because `robots.txt` disallows
 * everything, which is exactly why it had to be fixed *before* D-6 is decided rather than after.
 */
test('an unknown URL answers 404 while still rendering something useful', async ({ page, request }) => {
  const bare = await request.get('/no-such-page');
  expect(bare.status(), 'soft 404 — a crawler would index this as a real page').toBe(404);

  // A locale-prefixed miss is the same kind of miss.
  expect((await request.get('/de/no-such-page')).status()).toBe(404);

  // The status is for machines; a person still gets a page with a way back.
  await page.goto('/no-such-page');
  await expect(page.locator('abc-not-found-page, main').first()).toBeVisible();
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

/**
 * The sitemap is gated on the same flag as robots.txt.
 *
 * Serving a list of URLs while `robots.txt` says `Disallow: /` would have the site contradicting
 * itself — one file inviting a crawler to fetch what the other forbids. Off means off.
 */
test('no sitemap is served while the site is excluded from search', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  const body = await robots.text();
  const excluded = body.includes('Disallow: /\n') && !body.includes('Disallow: /admin');

  const sitemap = await request.get('/sitemap.xml');
  if (excluded) {
    expect(sitemap.status(), 'a sitemap must not advertise URLs robots.txt forbids').toBe(404);
    expect(body, 'robots.txt must not point at a sitemap it is hiding').not.toContain('Sitemap:');
  } else {
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toMatch(/xml/);
    const xml = await sitemap.text();
    // Careers is the point of task 146; the home page alone would not satisfy it.
    expect(xml).toContain('/careers');
    expect(xml).toContain('hreflang="x-default"');
    expect(body).toContain('Sitemap:');
  }
});
