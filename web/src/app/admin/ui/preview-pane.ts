import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';
import { PreviewContentStore } from './preview-store';
import { AdminContentType } from '../core/admin-api';
import { Locale } from '../../core/i18n/locales';
import { ServicesCarousel } from '../../public/sections/services-carousel';
import { PricingSection } from '../../public/sections/pricing-section';
import { TestimonialsCarousel } from '../../public/sections/testimonials-carousel';
import { FaqSection } from '../../public/sections/faq-section';
import { HeroSection } from '../../public/sections/hero-section';
import { AssuranceBar } from '../../public/sections/assurance-bar';
import { ProcessSteps } from '../../public/sections/process-steps';
import { ApproachSection } from '../../public/sections/approach-section';
import { StatsBand } from '../../public/sections/stats-band';
import { AngelNetworkSection } from '../../public/sections/angel-network-section';
import { CtaBand } from '../../public/sections/cta-band';
import { TopContactStrip } from '../../public/sections/top-contact-strip';
import { SiteFooter } from '../../public/sections/site-footer';

/**
 * E-8: the preview renders the ACTUAL public components — the element-injector override below
 * swaps the root SiteContentStore for a preview-fed twin within this subtree only, so the exact
 * production templates run against the draft being edited.
 */
@Component({
  selector: 'abc-preview-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PreviewContentStore, { provide: SiteContentStore, useExisting: PreviewContentStore }],
  imports: [
    ServicesCarousel,
    PricingSection,
    TestimonialsCarousel,
    FaqSection,
    HeroSection,
    AssuranceBar,
    ProcessSteps,
    ApproachSection,
    StatsBand,
    AngelNetworkSection,
    CtaBand,
    TopContactStrip,
    SiteFooter,
  ],
  template: `
    <div class="border border-brand-line rounded-card overflow-hidden bg-white scale-90 origin-top" data-testid="preview-pane">
      @switch (type()) {
        @case ('services') { <abc-services-carousel /> }
        @case ('plans') { <abc-pricing-section /> }
        @case ('testimonials') { <abc-testimonials-carousel /> }
        @case ('faqs') { <abc-faq-section /> }
        @case ('settings') {
          <abc-top-contact-strip />
          <abc-site-footer />
        }
        @case ('sections') {
          @switch (sectionKey()) {
            @case ('hero') { <abc-hero-section /> }
            @case ('assurance') { <abc-assurance-bar /> }
            @case ('process') { <abc-process-steps /> }
            @case ('approach') { <abc-approach-section /> }
            @case ('stats') { <abc-stats-band /> }
            @case ('angel') { <abc-angel-network-section /> }
            @case ('cta') { <abc-cta-band /> }
          }
        }
      }
    </div>
  `,
})
export class PreviewPane {
  readonly type = input.required<AdminContentType>();
  readonly document = input.required<Record<string, unknown>>();
  readonly locale = input.required<Locale>();

  private readonly previewStore = inject(PreviewContentStore);

  constructor() {
    effect(() => this.previewStore.setFrom(this.type(), this.document(), this.locale()));
  }

  protected sectionKey(): string {
    return String(this.document()['key'] ?? '').toLowerCase();
  }
}
