import { expect, test } from '@playwright/test';
import { gotoLocale } from './support';

/** Phase C2 verification (careers-plan.md tasks 134, 137, 139). */

test.describe('The careers page', () => {
  test('renders every track with its requirements and documents', async ({ page }) => {
    await page.goto('/careers');
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/./);

    const cards = page.locator('[data-track]');
    await expect(cards).toHaveCount(6);

    // With self-service enrolment there is nothing between a visitor and the credentialing
    // reviewer's queue except these two lists, so an empty one defeats the page (careers-plan §1).
    for (const card of await cards.all()) {
      await expect(card.getByText(/What we look for/i)).toBeVisible();
      await expect(card.getByText(/What you will be asked for/i)).toBeVisible();
    }
  });

  /**
   * Task 137. The handoff is cross-domain — no shared session — so the link is the entire contract
   * with hc-professional. A card whose link carries the wrong role sends a candidate to the far
   * side to be asked their role a second time.
   */
  test('each track links out carrying its own authority role, locale and attribution', async ({ page }) => {
    await page.goto('/careers');
    const cards = await page.locator('[data-track]').all();
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      const expectedRole = await card.getAttribute('data-track');
      const href = await card.locator('a[href*="/register"]').first().getAttribute('href');
      const url = new URL(href!);

      expect(url.origin).toBe('https://professional.abofonsa.com');
      expect(url.pathname).toBe('/register');
      expect(url.searchParams.get('track')).toBe(expectedRole);
      expect(url.searchParams.get('src')).toBe('web-careers');
      expect(url.searchParams.get('locale')).toBe('en');
    }
  });

  test('the locale travels with the candidate', async ({ page }) => {
    await page.goto('/fr/careers');
    const href = await page.locator('a[href*="/register"]').first().getAttribute('href');
    expect(new URL(href!).searchParams.get('locale')).toBe('fr');
  });

  /**
   * Task 137's other half. The invitation route does not exist on professional.abofonsa.com yet,
   * so the call-to-action must stay hidden until an editor supplies a destination — its presence,
   * not a boolean, is the switch, precisely so it cannot be enabled while pointing at a 404.
   */
  test('the invitation call-to-action is absent until a destination is configured', async ({ page }) => {
    await page.goto('/careers');
    await expect(page.getByTestId('request-invitation')).toHaveCount(0);
  });

  /**
   * Task 133 rendered: a track with no rota is labelled, not hidden.
   *
   * Asserted per role rather than as "at least one of each". The weaker form passed against a
   * database where `paramedic` had been flipped to recruiting through the CMS and left that way,
   * and the page then advertised a vacancy on a rota that does not exist — the precise claim
   * careers-plan.md D-2 exists to avoid. It also let a visual baseline be captured from the drifted
   * state, which would have made the wrong page the reference for every later comparison.
   */
  test('each track is badged according to whether it actually has a rota', async ({ page }) => {
    await page.goto('/careers');
    await expect(page.locator('[data-track]')).toHaveCount(6);

    const recruiting = ['ROLE_NURSE', 'ROLE_CARER', 'ROLE_DOCTOR'];
    const building = ['ROLE_PARAMEDIC', 'ROLE_PHARMACIST', 'ROLE_THERAPIST'];

    for (const role of recruiting) {
      await expect(page.locator(`[data-track="${role}"] [data-testid="badge-recruiting"]`)).toBeVisible();
    }
    for (const role of building) {
      await expect(
        page.locator(`[data-track="${role}"] [data-testid="badge-building"]`),
        `${role} has no rota (careers-plan.md D-2) and must not be advertised as recruiting`,
      ).toBeVisible();
    }
  });

  /**
   * Task 138. schema.org/JobPosting requires facts about employment type and pay that
   * careers-plan.md D-3 has not settled. A partially-populated JobPosting publishes a claim about
   * terms into search results, so there must be none at all until those are decided.
   */
  test('carries page metadata but no JobPosting structured data while terms are undecided', async ({ page }) => {
    await page.goto('/careers');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/careers$/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /./);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.join(''), 'no JobPosting until D-3 settles terms').not.toContain('JobPosting');
  });

  /**
   * The call-to-action reads as a sentence in every language.
   *
   * The track name is a separate element inside the label so the English name can be marked
   * `lang="en"` while the sentence around it stays in the page's language (WCAG 2.2 AA 3.1.2). That
   * split is invisible in the DOM and was rendered as "Apply as aRegistered nurse": the anchor is
   * `inline-flex`, which promotes each text node to a flex item and then drops the whitespace
   * between items. Nothing else would have caught it — the markup is correct, the accessible name
   * is *computed* with the space restored, and the visual baseline would simply have recorded the
   * broken text as the expected picture.
   *
   * Probed with `innerText`, and specifically for a line break. `textContent` reports the spaces
   * whether or not they render, so it cannot see this at all. `innerText` is layout-aware: when the
   * pieces are flex items it returns "Als\nRegistered nurse\nbewerben", and when they are in normal
   * inline flow it returns "Als Registered nurse bewerben". The newline is the flex promotion
   * itself, which is the defect — measured against the pre-fix markup, the two differ in exactly
   * this way and by 8px of rendered width.
   */
  for (const locale of ['en', 'es', 'fr', 'de']) {
    test(`the call-to-action reads as one sentence, not three stacked pieces (${locale})`, async ({ page }) => {
      await page.goto(locale === 'en' ? '/careers' : `/${locale}/careers`);
      const cta = page.locator('[data-track="ROLE_NURSE"] a[href*="/register"]').first();
      await expect(cta).toBeVisible();

      const rendered = (await cta.evaluate((el) => (el as HTMLElement).innerText)).trim();
      expect(rendered).toContain('Registered nurse');
      expect(
        rendered,
        `the label broke into separate pieces in ${locale}: ${JSON.stringify(rendered)}`,
      ).not.toContain('\n');
      // The translated words must still be there — a split that dropped them would also be newline-free.
      expect(rendered.replace('Registered nurse', '').trim().length).toBeGreaterThan(0);
    });
  }

  /** Task 139 — reachable, and reachable in the right language. */
  test('is reachable from the header and the footer, locale-prefixed', async ({ page }) => {
    await gotoLocale(page, 'de');
    await expect(page.locator('[data-testid="nav-careers"]:visible')).toHaveAttribute('href', '/de/careers');
    await expect(page.locator('[data-testid="footer-careers"]')).toHaveAttribute('href', '/de/careers');

    await page.locator('[data-testid="nav-careers"]:visible').click();
    await expect(page).toHaveURL(/\/de\/careers$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  /**
   * Task 134. The careers route is lazy so a family visiting the home page never pays for it.
   * Asserted by behaviour — the chunk arrives only on navigation — rather than by reading the
   * build output, which would not catch an eager import that the bundler happened to inline.
   */
  test('its code is not downloaded until the page is visited', async ({ page }) => {
    const fetched: string[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.js')) {
        fetched.push(response.url());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    const onHomePage = fetched.length;

    await page.locator('[data-testid="nav-careers"]:visible').click();
    await expect(page).toHaveURL(/\/careers$/);
    await page.waitForLoadState('networkidle');

    expect(fetched.length, 'careers code should arrive only on navigation').toBeGreaterThan(onHomePage);
  });
});
