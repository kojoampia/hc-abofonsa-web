import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #11 — the Angel network split section. */
@Component({
  selector: 'abc-angel-network-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (angel(); as angel) {
      <section class="py-16 bg-brand-cream" aria-labelledby="angel-heading">
        <div class="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div class="prose-reset flex flex-col gap-4">
            <p class="text-brand-gold text-sm uppercase tracking-wide">{{ angel.eyebrow }}</p>
            <h2 id="angel-heading" class="font-serif text-3xl text-brand-navy">{{ angel.heading }}</h2>
            <ul class="grid gap-5 list-none m-0 p-0 mt-2">
              @for (feature of angel.items; track feature.key) {
                <li class="prose-reset">
                  <b class="text-brand-navy">{{ feature.title }}</b>
                  <p class="text-sm text-brand-body mt-1">{{ feature.body }}</p>
                </li>
              }
            </ul>
          </div>
          <div class="rounded-card bg-brand-line aspect-[4/3] relative overflow-hidden">
            @if (angel.image; as image) {
              <img [src]="image.url" [alt]="image.alt" loading="lazy" class="absolute inset-0 w-full h-full object-cover" />
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class AngelNetworkSection {
  protected readonly angel = inject(SiteContentStore).section('angel');
}
