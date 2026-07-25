import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #16 — the closing call to action. */
@Component({
  selector: 'abc-cta-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (cta(); as cta) {
      <section class="bg-brand-navy text-white py-16 text-center" aria-labelledby="cta-heading">
        <div class="max-w-3xl mx-auto px-4 prose-reset flex flex-col items-center gap-5">
          <h2 id="cta-heading" class="font-serif text-3xl">{{ cta.heading }}</h2>
          <p class="text-white/85">{{ cta.body }}</p>
          <div class="flex flex-wrap justify-center gap-3">
            <a href="#contact" class="bg-brand-gold text-white rounded px-5 py-3">{{ 'common.requestConsultation' | transloco }}</a>
            @if (store.settings(); as settings) {
              <a href="tel:{{ settings.phones[0] }}" class="border border-white/40 rounded px-5 py-3">
                {{ settings.phones[0] }}
              </a>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class CtaBand {
  protected readonly store = inject(SiteContentStore);
  protected readonly cta = this.store.section('cta');
}
