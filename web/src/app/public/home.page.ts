import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { SiteContentStore } from '../core/api/site-content.store';
import { SeoService } from '../core/seo/seo.service';
import { LocaleService } from '../core/i18n/locale.service';
import { HeroSection } from './sections/hero-section';
import { AssuranceBar } from './sections/assurance-bar';
import { ServicesCarousel } from './sections/services-carousel';
import { ProcessSteps } from './sections/process-steps';
import { ApproachSection } from './sections/approach-section';
import { StatsBand } from './sections/stats-band';
import { AngelNetworkSection } from './sections/angel-network-section';
import { PricingSection } from './sections/pricing-section';
import { PricingTable } from './sections/pricing-table';
import { TestimonialsCarousel } from './sections/testimonials-carousel';
import { FaqSection } from './sections/faq-section';
import { CtaBand } from './sections/cta-band';
import { ContactSection } from './sections/contact-section';

/** The single scrolling page (spec §5.4): the 18 §6 components stacked in prototype order, all
 * reading from the one SiteContentStore. */
@Component({
  selector: 'abc-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSection,
    AssuranceBar,
    ServicesCarousel,
    ProcessSteps,
    ApproachSection,
    StatsBand,
    AngelNetworkSection,
    PricingSection,
    PricingTable,
    TestimonialsCarousel,
    FaqSection,
    CtaBand,
    ContactSection,
  ],
  template: `
    <main id="main">
      <abc-hero-section />
      <abc-assurance-bar />
      <abc-services-carousel />
      <abc-process-steps />
      <abc-approach-section />
      <abc-stats-band />
      <abc-angel-network-section />
      <abc-pricing-section />
      <abc-pricing-table />
      <abc-testimonials-carousel />
      <abc-faq-section />
      <abc-cta-band />
      <abc-contact-section />
    </main>
  `,
})
export class HomePage {
  private readonly store = inject(SiteContentStore);
  private readonly seo = inject(SeoService);
  private readonly locale = inject(LocaleService);

  constructor() {
    // Head metadata follows the loaded content and locale (spec §6.3).
    effect(() => {
      const content = this.store.content();
      if (content) {
        this.seo.apply(this.locale.current(), content);
      }
    });
  }
}
