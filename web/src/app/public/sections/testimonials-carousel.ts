import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BrandCarousel } from '../../shared/ui/brand-carousel';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #14 — the four testimonials in the shared BrandCarousel. */
@Component({
  selector: 'abc-testimonials-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandCarousel, TranslocoPipe],
  template: `
    <section id="testimonials" class="py-16" aria-labelledby="testimonials-heading">
      <div class="max-w-4xl mx-auto px-4">
        <h2 id="testimonials-heading" class="font-serif text-3xl text-brand-navy mb-8">
          {{ 'nav.testimonials' | transloco }}
        </h2>
        <abc-brand-carousel [items]="store.stories()" [label]="carouselLabel()">
          <ng-template #slide let-story>
            <figure class="bg-brand-surface rounded-card shadow-card p-8 prose-reset mx-1">
              <div class="text-brand-gold" [attr.aria-label]="('testimonials.ratingLabel' | transloco) + ': ' + story.rating + '/5'">
                <span aria-hidden="true">{{ '★'.repeat(story.rating) }}</span>
              </div>
              <blockquote class="mt-4 text-brand-body leading-relaxed">“{{ story.quote }}”</blockquote>
              <figcaption class="mt-5">
                <b class="text-brand-navy block">{{ story.personName }}</b>
                <span class="text-sm text-brand-muted">{{ story.personRole }}</span>
                <span class="ml-2 inline-block text-xs bg-brand-cream text-brand-navy rounded px-2 py-0.5">
                  {{ 'testimonials.planLabel' | transloco: { plan: story.planLabel } }}
                </span>
              </figcaption>
            </figure>
          </ng-template>
        </abc-brand-carousel>
      </div>
    </section>
  `,
})
export class TestimonialsCarousel {
  protected readonly store = inject(SiteContentStore);
  private readonly transloco = inject(TranslocoService);

  protected carouselLabel(): string {
    return this.transloco.translate('a11y.carouselRegion');
  }
}
