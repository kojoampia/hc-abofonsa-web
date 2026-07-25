import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEs from '@angular/common/locales/es';
import localeFr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { TranslocoHttpLoader } from './core/i18n/transloco-http.loader';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './core/i18n/locales';

// Prices/dates format per locale via Angular's own CLDR data (spec §10.5).
[localeEs, localeFr, localeDe].forEach((data) => registerLocaleData(data));

/**
 * Application bootstrap (spec §5.1): zoneless, signal-first, SSR-hydrated with event replay —
 * the carousel arrows and FAQ accordion are interactive before hydration completes, and event
 * replay ensures a click in that window is not lost.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LOCALES],
        defaultLang: DEFAULT_LOCALE,
        fallbackLang: DEFAULT_LOCALE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: isDevMode(), useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoMessageformat(),
  ],
};
