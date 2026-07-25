import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleService } from '../core/i18n/locale.service';
import { DEFAULT_LOCALE, isSupportedLocale } from '../core/i18n/locales';

/**
 * Shell for the public single-page site (spec §5.4): resolves the active locale from the path
 * prefix (step 1 of the §10.4 resolution order) and applies it. Header/footer and the section
 * stack land in Phase 12.
 */
@Component({
  selector: 'abc-public-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
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
    // A cookie/navigator resolution only applies at `/` - an explicit path prefix always wins.
    this.localeService.use(isSupportedLocale(fromPath) ? fromPath : locale);
    this.transloco.setActiveLang(this.localeService.current());
  }
}
