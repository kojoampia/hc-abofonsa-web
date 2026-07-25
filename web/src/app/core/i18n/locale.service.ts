import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_LOCALE, Locale, isSupportedLocale } from './locales';

const COOKIE_NAME = 'abofonsa_locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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

  private readonly currentLocale = signal<Locale>(DEFAULT_LOCALE);

  readonly current = this.currentLocale.asReadonly();

  use(locale: Locale): void {
    this.currentLocale.set(locale);
    this.document.documentElement.lang = locale;
    if (this.isBrowser) {
      this.document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};SameSite=Lax`;
    }
  }

  /** The remembered cookie value, if any — step 2 of the §10.4 resolution order. */
  fromCookie(): Locale | null {
    const match = this.document.cookie?.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    const value = match?.[1];
    return isSupportedLocale(value) ? value : null;
  }

  /** Best `Accept-Language` match — step 3 of the §10.4 resolution order (browser fallback). */
  fromNavigator(): Locale | null {
    if (!this.isBrowser) {
      return null;
    }
    for (const tag of navigator.languages ?? []) {
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
