import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LocaleService } from '../core/i18n/locale.service';
import { DEFAULT_LOCALE, isSupportedLocale } from '../core/i18n/locales';
import { DemoNoticeBar } from './sections/demo-notice-bar';
import { TopContactStrip } from './sections/top-contact-strip';
import { SiteHeader } from './sections/site-header';
import { SiteFooter } from './sections/site-footer';

/**
 * Shell for the public site (spec §5.4): skip link first (§6.2), demo bar, contact strip, sticky
 * header, routed page, footer. Resolves the active locale from the path prefix (step 1 of the
 * §10.4 order; cookie and Accept-Language only apply at `/`).
 */
@Component({
  selector: 'abc-public-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TranslocoPipe, DemoNoticeBar, TopContactStrip, SiteHeader, SiteFooter],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-brand-navy focus:text-white focus:px-4 focus:py-2"
    >
      {{ 'a11y.skipToContent' | transloco }}
    </a>
    <abc-demo-notice-bar />
    <abc-top-contact-strip />
    <abc-site-header />
    <router-outlet />
    <abc-site-footer />
  `,
})
export class PublicShell {
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    const fromPath = this.route.snapshot.paramMap.get('locale');
    const locale = isSupportedLocale(fromPath)
      ? fromPath
      : (this.localeService.fromCookie() ?? this.localeService.fromNavigator() ?? DEFAULT_LOCALE);
    this.localeService.use(isSupportedLocale(fromPath) ? fromPath : locale);
    this.transloco.setActiveLang(this.localeService.current());
  }
}
