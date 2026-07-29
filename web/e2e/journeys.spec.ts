import { expect, test } from '@playwright/test';
import { API_BASE, PROFESSIONAL_PORTAL, adminTokens, authHeaders, gotoLocale, signInBrowser, withPortalConfigured } from './support';

/** The eight spec §11.3 end-to-end journeys (plan tasks 93-100). */

test.describe('Journey 1 — browse and convert', () => {
  test('page through services, open FAQs, submit the consultation form', async ({ page, request }) => {
    await gotoLocale(page, 'en');

    // The services carousel pages forward and exactly one dot stays current.
    const carousel = page.locator('abc-services-carousel');
    await expect(carousel.locator('[aria-roledescription="slide"]')).toHaveCount(6);
    await carousel.getByRole('button', { name: /next/i }).click();
    await expect(carousel.locator('.carousel-dot[aria-current="true"]')).toHaveCount(1);

    // Two FAQ items open.
    const faqHeaders = page.locator('abc-faq-section mat-expansion-panel-header');
    await faqHeaders.nth(0).click();
    await faqHeaders.nth(1).click();
    await expect(page.locator('abc-faq-section .mat-expansion-panel-content').first()).toBeVisible();

    // Submit the enquiry. The dwell-time check needs the form to have been on screen a moment.
    const uniqueName = `E2E Visitor ${Date.now()}`;
    await page.getByTestId('enquiry-name').fill(uniqueName);
    await page.getByTestId('enquiry-phone').fill('+233 24 000 0000');
    await page.getByTestId('enquiry-email').fill('e2e@example.com');
    await page.getByTestId('enquiry-message').fill('Please call me back about care options.');
    // mat-checkbox carries the testid on its host element; the real control is the inner input.
    await page.getByTestId('enquiry-consent').locator('input[type=checkbox]').check();
    // Deliberately no pause before submitting. This used to wait out spec §7.7's minimum dwell,
    // which meant the test never exercised what a decisive visitor actually does — fill the form
    // quickly and press send — and so never saw that they were rejected as a bot and shown a
    // content-load error. The component now waits out the remainder itself, so submitting
    // immediately must succeed.
    await page.getByTestId('enquiry-submit').click();

    const confirmation = page.getByTestId('enquiry-confirmation');
    await expect(confirmation).toBeVisible();
    const reference = (await page.getByTestId('enquiry-reference').textContent())?.trim();
    expect(reference).toMatch(/^ENQ-\d{4}-\d{6}$/);

    // ...and it really reached MongoDB, visible through the staff API.
    const tokens = await adminTokens(request);
    const inbox = await request.get(`${API_BASE}/admin/enquiries`, { headers: authHeaders(tokens) });
    expect(inbox.ok()).toBeTruthy();
    const enquiries = (await inbox.json()) as Array<{ reference: string; name: string }>;
    expect(enquiries.some((enquiry) => enquiry.reference === reference && enquiry.name === uniqueName)).toBeTruthy();
  });
});

test.describe('Journey 2 — locale switch', () => {
  const expectations = [
    { locale: 'en', nav: 'Plans and pricing', price: /GH₵3,000/ },
    { locale: 'es', nav: 'Planes y precios', price: /3\.000\s*GH₵/ },
    { locale: 'fr', nav: 'Forfaits et tarifs', price: /3\s+000\s*GH₵/ },
    { locale: 'de', nav: 'Tarife und Preise', price: /3\.000\s*GH₵/ },
  ];

  for (const { locale, nav, price } of expectations) {
    test(`${locale}: html lang, navigation labels and §10.5 price formatting`, async ({ page }) => {
      await gotoLocale(page, locale);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('abc-site-header nav')).toContainText(nav);

      const pearPrice = page.locator('article[data-plan="PEAR"] [data-testid="plan-price"]');
      await expect(pearPrice).toHaveText(price);

      // hreflang alternates for all four locales plus x-default (spec §6.3).
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
        links.map((link) => link.getAttribute('hreflang')).sort(),
      );
      expect(hreflangs).toEqual(['de', 'en', 'es', 'fr', 'x-default']);
    });
  }
});

test.describe('Journey 2b — switching language with the chooser', () => {
  /**
   * Journey 2 above proves each locale *renders* when visited directly. It never used the chooser,
   * so it missed the defect a tester found immediately: you could switch to any language and never
   * back to English.
   *
   * English is the only locale without a path prefix, so choosing it lands on `/`, which is
   * indistinguishable from a first visit — and the shell resolves `/` from the locale cookie, which
   * still held the language being abandoned. Every switch worked except the one back.
   */
  test('every locale can be chosen, including returning to English', async ({ page }) => {
    await gotoLocale(page, 'en');

    // The header renders a switcher for each breakpoint — one in the desktop nav, one beside the
    // mobile menu button — so exactly one is visible at a time. Targeting the visible one is both
    // unambiguous and what a real click hits.
    const button = (code: string) => page.locator(`[data-testid="lang-${code}"]:visible`);

    const chooseAndExpect = async (code: string, expectedPath: RegExp) => {
      await button(code).click();
      await expect(page).toHaveURL(expectedPath);
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      // The active button is the one just chosen, and only that one.
      await expect(page.locator('[data-testid="language-switcher"]:visible [aria-current="true"]')).toHaveCount(1);
      await expect(button(code)).toHaveAttribute('aria-current', 'true');
    };

    await chooseAndExpect('es', /\/es$/);
    await chooseAndExpect('en', /\/$/); // the regression: this used to stay Spanish
    await chooseAndExpect('fr', /\/fr$/);
    await chooseAndExpect('en', /\/$/);
    await chooseAndExpect('de', /\/de$/);
    await chooseAndExpect('en', /\/$/);
  });

  /**
   * The chooser is code buttons by client decision (2026-07-26), superseding the spec's §6 table,
   * which says `mat-select`. Asserted here so a revert to a dropdown — or a switch to flags —
   * fails the suite rather than shipping. See CONTRIBUTING.md, "Deliberate departures from the
   * spec", before changing this.
   */
  test('the chooser is one code button per locale, not a dropdown and not flags', async ({ page }) => {
    await gotoLocale(page, 'en');
    const chooser = page.locator('[data-testid="language-switcher"]:visible');

    await expect(chooser.locator('button')).toHaveCount(4);
    const codes = (await chooser.locator('button').allTextContents()).map((text) => text.trim());
    expect(codes).toEqual(['en', 'es', 'fr', 'de']);
    // Visible text is the code; the accessible name is the language's own endonym.
    await expect(page.locator('[data-testid="lang-es"]:visible')).toHaveAttribute('aria-label', 'Español');
    // No select control, and no flag imagery, anywhere in the chooser.
    await expect(chooser.locator('select, mat-select, [role="combobox"], img, svg')).toHaveCount(0);
  });

  test('the choice survives a reload, because it is what the cookie now remembers', async ({ page }) => {
    await gotoLocale(page, 'en');
    await page.locator('[data-testid="lang-de"]:visible').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    // Back to English, then reload `/` — the cookie must say English, or the reload reverts.
    await page.locator('[data-testid="lang-en"]:visible').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('Journey 3 — no authentication on the public site (guards R8)', () => {
  test('no password input, no sign-in link, and no cookie beyond the functional locale one', async ({ page }) => {
    for (const locale of ['en', 'es', 'fr', 'de']) {
      await gotoLocale(page, locale);

      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      const signInLinks = page.getByRole('link', { name: /sign in|log ?in|admin/i });
      await expect(signInLinks).toHaveCount(0);

      const cookies = await page.context().cookies();
      const unexpected = cookies.filter((cookie) => cookie.name !== 'abofonsa_locale');
      expect(unexpected, `unexpected cookies on /${locale}: ${JSON.stringify(unexpected)}`).toHaveLength(0);
    }
  });

  test('the admin surface is not reachable without a token', async ({ request }) => {
    const response = await request.get(`${API_BASE}/admin/enquiries`);
    expect(response.status()).toBe(401);
  });
});

test.describe('Journey 4 — editorial round trip', () => {
  test('an editor changes a Spanish blurb, publishes, and the public Spanish page shows it', async ({
    page,
    request,
  }) => {
    const tokens = await adminTokens(request);
    const headers = authHeaders(tokens);

    const listResponse = await request.get(`${API_BASE}/admin/content/services`, { headers });
    const services = (await listResponse.json()) as Array<{
      id: string;
      version: number;
      document: Record<string, unknown>;
    }>;
    const target = services.find((service) => service.document['slug'] === 'skilled-nursing-visits')!;
    const originalBlurb = { ...(target.document['blurb'] as Record<string, string>) };
    const newSpanish = `Texto revisado por la editora ${Date.now()}`;

    try {
      await signInBrowser(page, tokens);
      await page.goto(`/admin/content/services/${target.id}`);
      await page.getByTestId('tab-es').click();
      // `blurb` is a `localized-area` field, so the control is a textarea keyed by the field name.
      const blurbField = page.locator('textarea#blurb');
      await blurbField.fill(newSpanish);
      await page.getByTestId('save-publish').click();
      await expect(page.getByTestId('publish-problem')).toHaveCount(0);
      // Wait for the editor to confirm rather than racing it: navigating away the instant the click
      // returns can outrun the save and publish requests it kicked off.
      await expect(page.locator('simple-snack-bar')).toContainText('Published.');

      await gotoLocale(page, 'es');
      await expect(page.locator('abc-services-carousel')).toContainText(newSpanish);
    } finally {
      // Restore the seeded copy so later runs — and the visual baselines — start clean, whether or
      // not the assertions above held.
      const reread = await request.get(`${API_BASE}/admin/content/services/${target.id}`, { headers });
      const current = (await reread.json()) as { version: number; document: Record<string, unknown> };
      await request.put(`${API_BASE}/admin/content/services/${target.id}`, {
        headers,
        data: { ...current.document, blurb: originalBlurb, version: current.version },
      });
      await request.post(`${API_BASE}/admin/content/services/${target.id}/publish`, { headers });
    }
  });
});

test.describe('Journey 5 — translation fallback', () => {
  test('a missing German field renders the English text, never an empty element or a raw key', async ({
    page,
    request,
  }) => {
    const tokens = await adminTokens(request);
    const headers = authHeaders(tokens);

    const created = await request.post(`${API_BASE}/admin/content/faqs`, {
      headers,
      data: {
        question: { en: 'Journey 5 English-only question?' }, // deliberately no German
        answer: { en: 'Journey 5 English-only answer.' },
        category: 'COVERAGE',
        displayOrder: 90,
      },
    });
    const faq = (await created.json()) as { id: string };
    // Cleanup in `finally`: a published fixture that outlives a failed assertion leaks into every
    // later run — and into the visual baselines — as an extra FAQ nobody put there.
    try {
      await request.post(`${API_BASE}/admin/content/faqs/${faq.id}/publish`, { headers });

      await gotoLocale(page, 'de');
      const accordion = page.locator('abc-faq-section');
      await expect(accordion).toContainText('Journey 5 English-only question?');
      // No raw keys and no blank panel titles anywhere in the German accordion.
      const titles = await accordion.locator('mat-panel-title').allTextContents();
      expect(titles.every((title) => title.trim().length > 0)).toBeTruthy();
      expect(titles.some((title) => /^[a-z]+\.[a-z]/i.test(title.trim()))).toBeFalsy();
    } finally {
      await request.delete(`${API_BASE}/admin/content/faqs/${faq.id}`, { headers });
    }
  });
});

test.describe('Journey 6 — consent gate', () => {
  test('publishing a testimonial without consent is refused and it stays DRAFT', async ({ request }) => {
    const tokens = await adminTokens(request);
    const headers = authHeaders(tokens);

    const created = await request.post(`${API_BASE}/admin/content/testimonials`, {
      headers,
      data: {
        quote: { en: 'Journey 6 testimonial' },
        personName: 'Journey Six',
        personRole: { en: 'Tester' },
        planLabel: { en: 'PEAR Plan' },
        rating: 5,
        consent: { obtained: false },
        displayOrder: 90,
      },
    });
    const testimonial = (await created.json()) as { id: string };

    const publish = await request.post(`${API_BASE}/admin/content/testimonials/${testimonial.id}/publish`, {
      headers,
    });
    expect(publish.status()).toBe(409);

    const reread = await request.get(`${API_BASE}/admin/content/testimonials/${testimonial.id}`, { headers });
    expect(((await reread.json()) as { status: string }).status).toBe('DRAFT');

    await request.delete(`${API_BASE}/admin/content/testimonials/${testimonial.id}`, { headers });
  });
});

test.describe('Journey 7 — rate limiting', () => {
  test('the sixth enquiry from one IP within an hour is rejected with 429', async ({ playwright }) => {
    // A dedicated context so this journey's submissions do not consume journey 1's budget:
    // the API keys the limit on a salted hash of X-Forwarded-For.
    const context = await playwright.request.newContext({
      extraHTTPHeaders: { 'X-Forwarded-For': `203.0.113.${40 + Math.floor(Math.random() * 200)}` },
    });
    const payload = {
      name: 'Rate Limit Probe',
      phone: '+233 24 000 0000',
      locale: 'en',
      sourcePage: '/#contact',
      consent: true,
      dwellMs: 9000,
    };

    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await context.post(`${API_BASE}/enquiries`, { data: payload });
      expect(response.status(), `submission ${attempt} should be accepted`).toBe(201);
    }
    const sixth = await context.post(`${API_BASE}/enquiries`, { data: payload });
    expect(sixth.status()).toBe(429);

    await context.dispose();
  });
});

test.describe('Freshness of the rendered HTML', () => {
  test('server-rendered pages revalidate while hashed assets stay immutable', async ({ request }) => {
    // Without this the browser applies heuristic freshness to the HTML and keeps showing content
    // an editor has already replaced — the failure journey 8 originally surfaced.
    const page = await request.get('/');
    expect(page.headers()['cache-control']).toContain('no-cache');

    const asset = await request.get('/favicon.ico');
    expect(asset.headers()['cache-control']).toContain('max-age=31536000');
  });
});

test.describe('Journey 8 — revision rollback', () => {
  test('edit, publish, roll back, and the public site reverts', async ({ browser, page, request }) => {
    const tokens = await adminTokens(request);
    const headers = authHeaders(tokens);
    const original = `Journey 8 original ${Date.now()}`;
    const edited = `Journey 8 edited ${Date.now()}`;

    const created = await request.post(`${API_BASE}/admin/content/faqs`, {
      headers,
      data: {
        question: { en: original, es: original, fr: original, de: original },
        answer: { en: 'A.', es: 'A.', fr: 'A.', de: 'A.' },
        category: 'PLANS',
        displayOrder: 91,
      },
    });
    const faq = (await created.json()) as { id: string; version: number; document: Record<string, unknown> };
    try {
      await request.post(`${API_BASE}/admin/content/faqs/${faq.id}/publish`, { headers });

      const updated = await request.put(`${API_BASE}/admin/content/faqs/${faq.id}`, {
        headers,
        data: {
          ...faq.document,
          question: { en: edited, es: edited, fr: edited, de: edited },
          version: faq.version,
        },
      });
      expect(updated.ok(), 'the edit must land, or the rollback below proves nothing').toBeTruthy();
      await request.post(`${API_BASE}/admin/content/faqs/${faq.id}/publish`, { headers });

      await gotoLocale(page, 'en');
      await expect(page.locator('abc-faq-section')).toContainText(edited);

      // Roll back to revision 1 — the public page must revert. Revision 1 is the snapshot taken
      // when the FAQ was created, before the edit above.
      const restore = await request.post(`${API_BASE}/admin/content/faqs/${faq.id}/revisions/1/restore`, { headers });
      expect(restore.ok()).toBeTruthy();

      // Verify in a fresh context, not by reloading `page`. Spec §7.4 puts
      // `Cache-Control: public, max-age=300` on the content API, so the browser that just loaded
      // the edited version legitimately replays it from cache for five minutes after hydration —
      // reloading here would test the HTTP cache, not the rollback. A visitor arriving after the
      // rollback has no such cache, and that is the behaviour this journey is about.
      const freshContext = await browser.newContext();
      try {
        const freshPage = await freshContext.newPage();
        await gotoLocale(freshPage, 'en');
        const accordion = freshPage.locator('abc-faq-section');
        await expect(accordion).toContainText(original);
        await expect(accordion).not.toContainText(edited);
      } finally {
        await freshContext.close();
      }
    } finally {
      await request.delete(`${API_BASE}/admin/content/faqs/${faq.id}`, { headers });
    }
  });
});

/**
 * Journey 9 — a candidate arrives, reads a role, and is handed to the onboarding app (task 140).
 *
 * The whole careers page exists to produce one outbound link, and that link is the entire contract
 * with `hc-professional`: the domains are different, so there is no shared session and anything the
 * far side needs has to survive in the URL.
 *
 * `careers.spec.ts` already asserts each card's `href`. This is the part an attribute check cannot
 * reach — that clicking really leaves the site. A relative URL, a router-intercepted click, or a
 * `preventDefault` somewhere would all keep the `href` correct while sending nobody anywhere.
 * The outbound request is intercepted rather than followed: professional.abofonsa.com is a separate
 * deployment, and a journey that depends on it passes or fails for reasons that have nothing to do
 * with this repository.
 */
test.describe('Journey 9 — careers handoff', () => {
  test('from the header, through a track, to the onboarding app with the right parameters', async ({
    page,
    request,
  }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
    let requested: URL | null = null;
    await page.route('https://professional.abofonsa.com/**', async (route) => {
      requested = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub portal</h1>' });
    });

    // A candidate does not arrive on /careers; they arrive on the site and look for the way in.
    await gotoLocale(page, 'fr');
    await page.locator('[data-testid="nav-careers"]:visible').click();
    await expect(page).toHaveURL(/\/fr\/careers$/);

    // They read a role. The nurse card is the one the service is actually built on.
    const card = page.locator('[data-track="ROLE_NURSE"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Nursing and Midwifery Council/i);

    await card.locator('a[href*="/register"]').first().click();
    await page.waitForURL(/professional\.abofonsa\.com/);

    expect(requested, 'clicking the CTA must actually leave the site').not.toBeNull();
    const url = requested!;
    expect(url.pathname).toBe('/register');
    // The role they chose, so they are not asked a second time.
    expect(url.searchParams.get('track')).toBe('ROLE_NURSE');
    // The language they were reading, so they are not dropped back into English mid-application.
    expect(url.searchParams.get('locale')).toBe('fr');
    // Attribution, without which nobody can say whether this page works (careers-plan.md §8).
    expect(url.searchParams.get('src')).toBe('web-careers');

    // No identifying information leaves web.abofonsa.com. Identification happens on the far side,
    // after the candidate has chosen to start — careers-plan.md §6 is explicit that this page
    // collects nothing, and a stray field added to this link would be the quiet way to break that.
    expect([...url.searchParams.keys()].sort()).toEqual(['locale', 'src', 'track']);
    });
  });

  /**
   * The page-level call to action, which is the same link without a role. It must omit `track`
   * rather than guessing one — sending everybody to the nurse form would be worse than asking.
   */
  test('the page-level call to action omits the role instead of inventing one', async ({ page, request }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
    let requested: URL | null = null;
    await page.route('https://professional.abofonsa.com/**', async (route) => {
      requested = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub portal</h1>' });
    });

    await page.goto('/careers');
    await page.getByTestId('apply-primary').first().click();
    await page.waitForURL(/professional\.abofonsa\.com/);

    expect(requested).not.toBeNull();
    expect(requested!.searchParams.has('track')).toBe(false);
    expect(requested!.searchParams.get('src')).toBe('web-careers');
    });
  });
});
