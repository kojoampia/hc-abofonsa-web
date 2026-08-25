import { expect, test } from '@playwright/test';
import { PROFESSIONAL_PORTAL, gotoLocale, withPortalConfigured } from './support';

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
  test('each track links out carrying its own authority role, locale and attribution', async ({ page, request }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
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
  });

  test('the locale travels with the candidate', async ({ page, request }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
      await page.goto('/fr/careers');
      const href = await page.locator('a[href*="/register"]').first().getAttribute('href');
      expect(new URL(href!).searchParams.get('locale')).toBe('fr');
    });
  });

  /**
   * The state the site actually ships in (careers-plan.md task 144).
   *
   * professional.abofonsa.com resolves but nothing serves it, and the page asks an applicant to
   * gather a licence and a Ghana Card *before* pressing the button — so a button that ends in a
   * connection error costs more than an absent one. Everything an applicant needs in order to decide
   * still renders; only the promise of a door is withheld.
   */
  test('no apply button renders while no portal is configured', async ({ page }) => {
    await page.goto('/careers');

    await expect(page.locator('[data-track]')).toHaveCount(6);
    await expect(page.locator('a[href*="/register"]')).toHaveCount(0);
    await expect(page.getByTestId('apply-primary')).toHaveCount(0);
    // The page is not gutted: the reason to apply, and the preparation, are still there.
    await expect(page.locator('[data-track="ROLE_NURSE"]')).toContainText(/Nursing and Midwifery Council/i);
    await expect(page.getByText(/What you will be asked for/i).first()).toBeVisible();
  });

  /**
   * The invitation call-to-action is gone, not gated.
   *
   * It used to render whenever `professionalInvitationUrl` held a value, on the reasoning that
   * presence is a switch nobody can flip before the destination exists. Somebody flipped it: the
   * field was filled in with the registration URL, and the button went live advertising an invitation
   * flow that has never been built. careers-plan.md D-1 puts that surface in `hc-professional` if it
   * is ever wanted, so there is nothing here to switch on.
   *
   * Asserted with the portal configured — the state in which the *other* buttons render — because a
   * test that only ever checks the switched-off page cannot tell "removed" from "not switched on".
   */
  test('there is no invitation call-to-action to configure', async ({ page, request }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
      await page.goto('/careers');
      // Two of them: the hero and the closing band. Their presence is what makes the absence below
      // mean something.
      await expect(page.getByTestId('apply-primary')).toHaveCount(2);
      await expect(page.getByTestId('apply-primary').first()).toBeVisible();
      await expect(page.getByTestId('request-invitation')).toHaveCount(0);
      await expect(page.getByText(/request an invitation/i)).toHaveCount(0);
    });
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
    // `/./` matched "careers.metaDescription" and let an untranslated key ship to production.
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /^careers\./);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\w+\s+\w+/);

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
    test(`the call-to-action reads as one sentence, not three stacked pieces (${locale})`, async ({
      page,
      request,
    }) => {
      await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
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
    });
  }

  /**
   * The page title and description resolve in every language, even when the translation bundle is
   * slow.
   *
   * This shipped broken. `careers.page.ts` sets the title from an effect whose dependencies are the
   * site settings and the locale; the title itself came from `TranslocoService.translate`, which is
   * a plain call that returns the *key* when that language's bundle has not loaded yet. Neither
   * dependency changes when the bundle later arrives, so the effect never re-ran and
   * `/de/careers` served — and kept showing, in the browser tab — `careers.metaTitle`.
   *
   * It passed locally and failed in production because it is a race, and the two environments
   * order it differently: the bundle and the settings request are in flight together, and only
   * when the settings win does the effect run too early. Locally the bundle is served by the same
   * container that is rendering; in production the settings come from an API on the same host and
   * arrive first.
   *
   * Delaying the bundle makes the losing order the only order, so this fails deterministically
   * against the code that was deployed rather than depending on which request happens to win.
   */
  for (const locale of ['en', 'es', 'fr', 'de']) {
    test(`page metadata survives a slow translation bundle (${locale})`, async ({ page }) => {
      await page.route(`**/i18n/${locale}.json`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });

      await page.goto(locale === 'en' ? '/careers' : `/${locale}/careers`);
      await expect(page.locator('[data-track]').first()).toBeVisible();

      await expect
        .poll(() => page.title(), { message: 'the title never resolved past the raw key' })
        .not.toMatch(/^careers\./);
      await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
        'content',
        /^careers\./,
      );
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

/**
 * The landing page's clinician entry points (task 147).
 *
 * careers-plan.md §5 kept recruitment off the home page entirely and CR-1 gave the reason — a family
 * evaluating care for a parent reads it as *"they are short-staffed"*. The owner reversed that and
 * asked for prominence, so what is verified here is that the reversal is the intended one: a band
 * addressed to clinicians, below the family-facing close, that still routes through the requirements
 * rather than around them.
 */
test.describe('The landing page for professionals', () => {
  test('carries a clinician call-to-action that reaches the careers page in every locale', async ({ page }) => {
    for (const locale of ['en', 'es', 'fr', 'de']) {
      await gotoLocale(page, locale);

      const band = page.locator('[data-testid="home-professional-cta"]');
      await expect(band).toBeVisible();
      // Translated, not an untranslated key — the home page serves four locales where the careers
      // page's CMS copy is English-only, which is why this copy comes from the bundles.
      await expect(band).not.toContainText(/careers\.home/);

      const expected = locale === 'en' ? '/careers' : `/${locale}/careers`;
      await expect(page.locator('[data-testid="home-careers-cta"]')).toHaveAttribute('href', expected);
    }
  });

  /**
   * The band sits after the closing call to action, not before it. Asserted rather than left to a
   * screenshot, because the ordering *is* the mitigation for CR-1 and a pixel diff would accept any
   * arrangement it was shown first.
   */
  test('addresses clinicians only after the case for care has been made', async ({ page }) => {
    await page.goto('/');

    const positions = await page.evaluate(() => {
      const top = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().top ?? NaN;
      return {
        pricing: top('#pricing'),
        professionals: top('#professionals'),
        contact: top('#contact'),
      };
    });

    expect(positions.professionals).toBeGreaterThan(positions.pricing);
    expect(positions.professionals).toBeLessThan(positions.contact);
  });

  /**
   * The header fits wherever it is shown — which it did not before this change, in any language.
   *
   * The desktop bar used to appear at `lg` (1024px) and needed 1066px in English and 1152px in
   * German to draw itself; in French it needed 1218px, more than its own 1152px container, so it
   * spilled even on a 1440px screen. Making the careers link a prominent button added 42–63px to
   * that, which is how it was found. The bar now starts at 1240px with tighter gaps.
   *
   * Nothing existing could have caught this: `branding.spec.ts` guards 390px, where the bar is
   * hidden, and the visual baselines are taken at 390, 834 and 1440 — no width where the bar is both
   * visible and short of room. French and German because they are the two longest sets of labels;
   * 1024 is a width where the drawer must have taken over, 1240 is the first width where the bar
   * draws, and 1440 is the desktop baseline.
   */
  for (const locale of ['fr', 'de']) {
    for (const width of [1024, 1240, 1440]) {
      test(`the header fits at ${width}px in ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await gotoLocale(page, locale);

        // Below 1240 the drawer is the navigation; at or above it the bar is.
        await expect(page.locator('[data-testid="nav-careers"]')).toBeVisible({ visible: width >= 1240 });

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          scrollWidth,
          `the page overflows by ${scrollWidth - clientWidth}px at ${width}px in ${locale}`,
        ).toBeLessThanOrEqual(clientWidth);
      });
    }
  }

  /** Below 1024px the drawer is the only navigation there is, and it had no careers entry at all. */
  test('the mobile drawer reaches the careers page too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByTestId('mobile-menu-button').click();
    await page.getByTestId('mobile-nav-careers').click();

    await expect(page).toHaveURL(/\/careers$/);
    await expect(page.locator('[data-track]').first()).toBeVisible();
  });

  test('the direct registration link carries its own attribution, and no guessed track', async ({ page, request }) => {
    await withPortalConfigured(request, PROFESSIONAL_PORTAL, async () => {
      await page.goto('/fr');
      const href = await page.getByTestId('home-apply').getAttribute('href');
      const url = new URL(href!);

      expect(url.origin).toBe(PROFESSIONAL_PORTAL);
      expect(url.pathname).toBe('/register');
      expect(url.searchParams.get('locale')).toBe('fr');
      // Separately attributed from the careers page, or the funnel cannot say which argument works.
      expect(url.searchParams.get('src')).toBe('web-home');
      // The home page never asked which role they hold; a default would reach the credentialing
      // queue as a stated fact (this is the defect task 144 found on the far side).
      expect(url.searchParams.has('track')).toBe(false);
    });
  });

  /**
   * One switch, both pages. The CMS field that withdraws the careers page's apply buttons has to
   * withdraw this one too, or the home page would advertise a door the careers page has closed.
   */
  test('offers no registration link while no portal is configured', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('home-apply')).toHaveCount(0);
    // Scoped to the professional portal on purpose. The patient offer band links to
    // patient.abofonsa.com/account/register, which a bare `*/register*` match also catches — this
    // assertion is about the clinician door being shut, not about every registration link on the page.
    await expect(page.locator('a[href*="professional.abofonsa.com"]')).toHaveCount(0);
    // The entry point itself stays: the roles link is what a clinician follows to find out more.
    await expect(page.getByTestId('home-careers-cta')).toBeVisible();
  });
});


/**
 * The landing page's offer to families (task 149).
 *
 * The claim and its conditions are one band, the button is a separate switch, and the page has to
 * make sense in every combination of the two — which is the part a screenshot cannot check.
 */
test.describe('The first-month-free offer', () => {
  test('states the offer and its terms together, in every locale', async ({ page }) => {
    for (const locale of ['en', 'es', 'fr', 'de']) {
      await gotoLocale(page, locale);

      const band = page.getByTestId('patient-offer-band');
      await expect(band).toBeVisible();
      // Localised, not English served under a foreign lang attribute — families are the reason this
      // site has four locales at all.
      await expect(band).not.toContainText(/patient\.(createAccount|signUpFree)/);
      // The conditions travel with the claim rather than sitting a scroll away.
      await expect(band).toContainText(/three|tres|trois|drei/i);
    }
  });

  /** An offer three screens down is a footnote; this one is meant to be the first thing after the hero. */
  test('sits directly under the hero, above the plans it applies to', async ({ page }) => {
    await page.goto('/');

    const positions = await page.evaluate(() => {
      const top = (s: string) => document.querySelector(s)?.getBoundingClientRect().top ?? NaN;
      return { hero: top('#hero-heading'), offer: top('#offer'), pricing: top('#pricing') };
    });

    expect(positions.offer).toBeGreaterThan(positions.hero);
    expect(positions.offer).toBeLessThan(positions.pricing);
  });

  test('sends a family to the patient portal at the path that portal really uses', async ({ page }) => {
    await page.goto('/fr');

    const href = await page.getByTestId('patient-signup').getAttribute('href');
    const url = new URL(href!);

    expect(url.origin).toBe('https://patient.abofonsa.com');
    // /account/register. Both portals answer 200 on any path, so the wrong one would look healthy.
    expect(url.pathname).toBe('/account/register');
    expect(url.searchParams.get('locale')).toBe('fr');
    expect(url.searchParams.get('src')).toBe('web-home');
  });

  test('the header and the drawer both lead to it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav-signup')).toHaveAttribute('href', '#offer');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('mobile-menu-button').click();
    await expect(page.getByTestId('mobile-nav-signup')).toBeVisible();
  });
});
