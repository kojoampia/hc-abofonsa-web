import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CareersContentStore } from '../careers-content.store';
import { CareersCta } from './careers-cta';
import { ContentLang } from '../content-lang.directive';

/** The careers page's opening — the §3 item 1 argument: this is organised clinical work, not
 * gig-work with a logo. Reuses the home hero's navy treatment so the page is recognisably the
 * same site, without sharing a component whose content shape differs. */
@Component({
  selector: 'abc-careers-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CareersCta, ContentLang],
  template: `
    @if (section(); as hero) {
      <section class="bg-brand-navy text-white" aria-labelledby="careers-heading">
        <div class="max-w-6xl mx-auto px-4 py-16 lg:py-24 prose-reset flex flex-col gap-5 max-w-3xl">
          @if (hero.eyebrow) {
            <span abcContentLang class="text-brand-gold text-sm tracking-wide uppercase">{{ hero.eyebrow }}</span>
          }
          <h1 abcContentLang id="careers-heading" class="font-serif text-4xl lg:text-5xl leading-tight">{{ hero.heading }}</h1>
          @if (hero.subheading) {
            <p abcContentLang class="text-lg text-white/80">{{ hero.subheading }}</p>
          }
          @if (hero.body) {
            <p abcContentLang class="text-white/70 leading-relaxed">{{ hero.body }}</p>
          }
          <div class="flex flex-wrap gap-3 mt-2">
            <abc-careers-cta />
          </div>
        </div>
      </section>
    }
  `,
})
export class CareersHero {
  private readonly store = inject(CareersContentStore);
  protected readonly section = this.store.section('careersHero');
}
