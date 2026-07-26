import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BrandCarousel } from '../../shared/ui/brand-carousel';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #7 — the six service slides in the shared BrandCarousel. */
@Component({
  selector: 'abc-services-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandCarousel, TranslocoPipe],
  template: `
    <section id="services" class="py-16 bg-brand-cream" aria-labelledby="services-heading">
      <div class="max-w-6xl mx-auto px-4">
        <h2 id="services-heading" class="font-serif text-3xl text-brand-navy mb-8">
          {{ 'nav.services' | transloco }}
        </h2>
        <abc-brand-carousel [items]="store.services()" [label]="carouselLabel()">
          <ng-template #slide let-service let-i="index">
            <article class="grid lg:grid-cols-2 bg-brand-surface rounded-card shadow-card overflow-hidden">
              <div class="bg-brand-line min-h-56 lg:min-h-96 relative">
                @if (service.image; as image) {
                  <img [src]="image.url" [alt]="image.alt" loading="lazy" class="absolute inset-0 w-full h-full object-cover" />
                }
              </div>
              <div class="p-8 lg:p-11 flex flex-col justify-center prose-reset gap-4">
                <span class="text-xs font-bold tracking-widest text-brand-gold-ink">
                  {{ 'services.slideLabel' | transloco: { index: i + 1, total: store.services().length } }}
                </span>
                <h3 class="text-2xl text-brand-navy">{{ service.name }}</h3>
                <p class="text-brand-body">{{ service.blurb }}</p>
                <ul class="grid gap-2 list-none m-0 p-0">
                  @for (point of service.points; track point) {
                    <li class="flex gap-2 items-start text-sm text-brand-body">
                      <span class="text-brand-ok" aria-hidden="true">✓</span>{{ point }}
                    </li>
                  }
                </ul>
                <p class="mt-3 pt-4 border-t border-brand-line text-sm">
                  <span class="text-brand-muted">{{ 'services.availableOn' | transloco }}</span>
                  <b class="text-brand-navy"> {{ service.availableOn }}</b>
                </p>
              </div>
            </article>
          </ng-template>
        </abc-brand-carousel>
      </div>
    </section>
  `,
})
export class ServicesCarousel {
  protected readonly store = inject(SiteContentStore);
  private readonly transloco = inject(TranslocoService);

  protected carouselLabel(): string {
    return this.transloco.translate('a11y.carouselRegion');
  }
}
