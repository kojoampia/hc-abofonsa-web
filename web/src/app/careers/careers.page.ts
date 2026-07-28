import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { SiteContentStore } from '../core/api/site-content.store';
import { SeoService } from '../core/seo/seo.service';
import { LocaleService } from '../core/i18n/locale.service';
import { CareersHero } from './sections/careers-hero';
import { CareersLife } from './sections/careers-life';
import { CareersTracks } from './sections/careers-tracks';
import { CareersProcess } from './sections/careers-process';
import { CareersFaq } from './sections/careers-faq';
import { CareersClosing } from './sections/careers-closing';

/**
 * `/careers` (careers-plan.md Phase C2). Lazily loaded, so a visitor who never comes here pays
 * nothing for it — the same arrangement that keeps the CMS out of the public bundle.
 */
@Component({
  selector: 'abc-careers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CareersHero, CareersLife, CareersTracks, CareersProcess, CareersFaq, CareersClosing],
  template: `
    <main id="main">
      <abc-careers-hero />
      <abc-careers-life />
      <abc-careers-tracks />
      <abc-careers-process />
      <abc-careers-faq />
      <abc-careers-closing />
    </main>
  `,
})
export class CareersPage {
  private readonly site = inject(SiteContentStore);
  private readonly seo = inject(SeoService);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);

  /**
   * The active language's loaded bundle.
   *
   * Load-bearing, and it was missing. `TranslocoService.translate` is a plain call that returns the
   * *key* when the bundle for that language has not arrived yet, and the effect below otherwise
   * depends only on the site settings and the locale — neither of which changes when the bundle
   * finally loads. So whenever the settings request won the race, the effect ran once, too early,
   * and `/de/careers` served `careers.metaTitle` as its title and never corrected it. Reading this
   * signal makes the bundle a dependency, so the effect re-runs the moment it is available.
   */
  private readonly translation = toSignal(this.transloco.selectTranslation());

  /** Translated, or null if that key is not loaded yet — Transloco echoes the key on a miss. */
  private translated(key: string, params?: Record<string, unknown>): string | null {
    const value = this.transloco.translate(key, params);
    return value === key ? null : value;
  }

  constructor() {
    effect(() => {
      const settings = this.site.settings();
      // Subscribes the effect to bundle loads; the value itself is not needed.
      this.translation();
      if (!settings) {
        return;
      }
      const locale = this.locale.current();
      // Title, description and a canonical for this route — deliberately no JobPosting structured
      // data (task 138). schema.org/JobPosting requires employment type, and Google additionally
      // expects a salary or an explicit statement of its absence; careers-plan.md D-3 leaves both
      // undecided, so any value here would be invented. A partially-populated JobPosting is worse
      // than none: it publishes a claim about terms into search results.
      const title = this.translated('careers.metaTitle', { organisation: settings.organisationName });
      const description = this.translated('careers.metaDescription');
      if (!title || !description) {
        // Belt and braces: `selectTranslation` follows the *active* language, which can briefly lag
        // `locale` during a switch. Leaving the previous metadata in place for one more tick beats
        // publishing a raw key into the browser tab.
        return;
      }

      this.seo.applyPage(locale, { title, description, path: 'careers' });
    });
  }
}
