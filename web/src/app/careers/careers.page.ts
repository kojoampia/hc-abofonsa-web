import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
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

  constructor() {
    effect(() => {
      const settings = this.site.settings();
      if (!settings) {
        return;
      }
      const locale = this.locale.current();
      // Title, description and a canonical for this route — deliberately no JobPosting structured
      // data (task 138). schema.org/JobPosting requires employment type, and Google additionally
      // expects a salary or an explicit statement of its absence; careers-plan.md D-3 leaves both
      // undecided, so any value here would be invented. A partially-populated JobPosting is worse
      // than none: it publishes a claim about terms into search results.
      this.seo.applyPage(locale, {
        title: this.transloco.translate('careers.metaTitle', { organisation: settings.organisationName }),
        description: this.transloco.translate('careers.metaDescription'),
        path: 'careers',
      });
    });
  }
}
