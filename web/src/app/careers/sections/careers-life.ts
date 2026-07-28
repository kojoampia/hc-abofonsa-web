import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CareersContentStore } from '../careers-content.store';

/** §3 item 1 in detail: what distinguishes this from agency work. Mirrors the home page's
 * approach section, whose four-item shape this content already matches. */
@Component({
  selector: 'abc-careers-life',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (section(); as life) {
      <section class="py-16 bg-brand-cream" aria-labelledby="careers-life-heading">
        <div class="max-w-6xl mx-auto px-4 prose-reset flex flex-col gap-6">
          @if (life.eyebrow) {
            <p class="text-brand-gold-ink text-sm uppercase tracking-wide">{{ life.eyebrow }}</p>
          }
          <h2 id="careers-life-heading" class="font-serif text-3xl text-brand-navy">{{ life.heading }}</h2>
          @if (life.subheading) {
            <p class="text-brand-body max-w-2xl">{{ life.subheading }}</p>
          }
          <div class="grid md:grid-cols-2 gap-x-10 gap-y-6 mt-2">
            @for (item of life.items; track item.key) {
              <div class="prose-reset">
                <b class="text-brand-navy block">{{ item.title }}</b>
                <p class="text-sm text-brand-body mt-1 leading-relaxed">{{ item.body }}</p>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class CareersLife {
  private readonly store = inject(CareersContentStore);
  protected readonly section = this.store.section('careersLife');
}
