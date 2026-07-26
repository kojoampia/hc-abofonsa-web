import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';
import { ResponsiveImage } from '../../shared/ui/responsive-image';

/** Spec §6 #9 — split image + the three coordinated-care features. */
@Component({
  selector: 'abc-approach-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResponsiveImage],
  template: `
    @if (approach(); as approach) {
      <section id="approach" class="py-16 bg-brand-cream" aria-labelledby="approach-heading">
        <div class="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div class="rounded-card bg-brand-line aspect-[4/3] relative overflow-hidden order-last lg:order-first">
            @if (approach.image; as image) {
              <abc-responsive-image [media]="image" sizes="(min-width: 1024px) 50vw, 100vw"
                    imgClass="absolute inset-0 w-full h-full object-cover" />
            }
          </div>
          <div class="prose-reset flex flex-col gap-4">
            <p class="text-brand-gold-ink text-sm uppercase tracking-wide">{{ approach.eyebrow }}</p>
            <h2 id="approach-heading" class="font-serif text-3xl text-brand-navy">{{ approach.heading }}</h2>
            <ul class="grid gap-5 list-none m-0 p-0 mt-2">
              @for (feature of approach.items; track feature.key) {
                <li class="prose-reset">
                  <b class="text-brand-navy">{{ feature.title }}</b>
                  <p class="text-sm text-brand-body mt-1">{{ feature.body }}</p>
                </li>
              }
            </ul>
          </div>
        </div>
      </section>
    }
  `,
})
export class ApproachSection {
  protected readonly approach = inject(SiteContentStore).section('approach');
}
