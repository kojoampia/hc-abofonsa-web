import { DOCUMENT, Injectable, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_LOCALE, Locale, isSupportedLocale } from './locales';

const COOKIE_NAME = 'abofonsa_locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * `Accept-Language: de-DE,de;q=0.9,en;q=0.8` → `['de-DE', 'de', 'en']`, highest quality first.
 * Entries without an explicit `q` default to 1.0 per RFC 9110, which the sort below preserves.
 */
function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) {
    return [];
  }
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params.find((param) => param.trim().startsWith('q='));
      return { tag: tag.trim(), quality: quality ? Number.parseFloat(quality.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.quality) && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

/**
 * Holds the active locale as a signal and applies its side effects: `<html lang>` (spec §6.2)
 * and the one-year functional cookie (§10.4 — strictly functional, no consent banner needed).
 * Resolution order on first load (path prefix → cookie → Accept-Language → en) is applied by
 * the routing layer, which calls {@link use} with whatever it resolved.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** The incoming SSR request; null in the browser, where the DOM carries the same information. */
  private readonly request = inject(REQUEST, { optional: true });

  private readonly currentLocale = signal<Locale>(DEFAULT_LOCALE);

  readonly current = this.currentLocale.asReadonly();

  use(locale: Locale): void {
    this.currentLocale.set(locale);
    this.document.documentElement.lang = locale;
    if (this.isBrowser) {
      this.document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};SameSite=Lax`;
    }
  }

  /**
   * The remembered cookie value, if any — step 2 of the §10.4 resolution order.
   *
   * Both sides read the cookie the visitor actually sent, but from different places: the browser
   * from `document.cookie`, the server from the request header. Reaching for `document.cookie`
   * during SSR is not merely empty, it throws `NotYetImplemented` — Angular's server DOM has no
   * cookie jar — so the platform check here is load-bearing, not defensive.
   */
  fromCookie(): Locale | null {
    const jar = this.isBrowser ? this.document.cookie : (this.request?.headers.get('cookie') ?? '');
    const match = jar?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    const value = match?.[1];
    return isSupportedLocale(value) ? value : null;
  }

  /**
   * Best `Accept-Language` match — step 3 of the §10.4 resolution order. Resolving this on the
   * server too means the first paint is already in the visitor's language; leaving it to
   * hydration would flash English at every non-English visitor.
   */
  fromNavigator(): Locale | null {
    const tags = this.isBrowser
      ? (navigator.languages ?? [])
      : parseAcceptLanguage(this.request?.headers.get('accept-language'));
    for (const tag of tags) {
      const base = tag.split('-')[0];
      if (isSupportedLocale(base)) {
        return base;
      }
    }
    return null;
  }

  /** The path prefix for a locale: `''` for English, `/es`-style for the rest (§5.4). */
  pathPrefix(locale: Locale = this.currentLocale()): string {
    return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  }
}
