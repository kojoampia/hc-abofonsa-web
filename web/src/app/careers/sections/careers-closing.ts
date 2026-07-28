import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CareersContentStore } from '../careers-content.store';
import { CareersCta } from './careers-cta';
import { ContentLang } from '../content-lang.directive';

/** The closing call to action, repeating the one from the hero — §3 item 6: one CTA, going to
 * exactly one place, offered again at the point someone has finished reading. */
@Component({
  selector: 'abc-careers-closing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CareersCta, ContentLang],
  template: `
    @if (section(); as cta) {
      <section class="bg-brand-navy text-white py-16" aria-labelledby="careers-closing-heading">
        <div class="max-w-4xl mx-auto px-4 text-center prose-reset flex flex-col items-center gap-4">
          <h2 abcContentLang id="careers-closing-heading" class="font-serif text-3xl">{{ cta.heading }}</h2>
          @if (cta.subheading) {
            <p abcContentLang class="text-white/80 max-w-2xl">{{ cta.subheading }}</p>
          }
          <div class="flex flex-wrap gap-3 justify-center mt-2">
            <abc-careers-cta />
          </div>
        </div>
      </section>
    }
  `,
})
export class CareersClosing {
  private readonly store = inject(CareersContentStore);
  protected readonly section = this.store.section('careersCta');
}
