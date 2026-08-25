import { Routes } from '@angular/router';
import { routes } from '../app.routes';
import { SUPPORTED_LOCALES } from '../core/i18n/locales';

/**
 * The two pages Google Play follows.
 *
 * <p>`/privacy` is fetched during app review and `/delete-account` is the account-deletion link on
 * the store listing. Both are also the pages a person reaches when they have decided to leave. What
 * is asserted here is not their wording — it is that they exist, at both the bare and the
 * locale-prefixed path, and that neither was quietly made lazy or moved behind the CMS.</p>
 */
describe('privacy and deletion pages', () => {
  const childrenOf = (predicate: (route: Routes[number]) => boolean): Routes => routes.find(predicate)?.children ?? [];

  /** The `path: ''` shell — what `/privacy` resolves through. */
  const bare = childrenOf((route) => route.path === '' && !!route.children);

  /** The locale-matcher shell — what `/fr/privacy` resolves through. */
  const localePrefixed = childrenOf((route) => !!route.matcher);

  it.each(['privacy', 'delete-account'])('serves /%s', (path) => {
    expect(bare.some((route) => route.path === path)).toBe(true);
  });

  it.each(['privacy', 'delete-account'])('serves /{locale}/%s for every non-English locale', (path) => {
    expect(localePrefixed.some((route) => route.path === path)).toBe(true);
    // Nothing locale-specific about the pages themselves — the assertion is that the prefixed shell
    // carries the same children, so a reader who arrived on /fr does not lose the link.
    expect(SUPPORTED_LOCALES.length).toBeGreaterThan(1);
  });

  it.each(['privacy', 'delete-account'])('keeps /%s eagerly loaded', (path) => {
    const route = bare.find((entry) => entry.path === path);

    // A lazy chunk that fails to load is a blank page. On these two that is a rejected app, not a
    // slow page — see the comment in app.routes.ts.
    expect(route?.component).toBeDefined();
    expect(route?.loadComponent).toBeUndefined();
  });

  it('gives the two shells identical children, so neither path can drift', () => {
    expect(localePrefixed.map((route) => route.path)).toEqual(bare.map((route) => route.path));
  });
});
