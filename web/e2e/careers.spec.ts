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

  /** Task 133 rendered: a track with no rota is labelled, not hidden. */
  test('a track without a rota is shown and labelled rather than dropped', async ({ page }) => {
    await page.goto('/careers');
    const building = page.locator('[data-testid="badge-building"]');
    await expect(building.first()).toBeVisible();
    // Every track is present regardless of its openings flag.
    await expect(page.locator('[data-track]')).toHaveCount(6);
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
