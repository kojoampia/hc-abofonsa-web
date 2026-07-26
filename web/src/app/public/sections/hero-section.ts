import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { ResponsiveImage } from '../../shared/ui/responsive-image';

/** Spec §6 #5 — the LCP element (§13.1): the hero image is eager with fetchpriority=high;
 * everything below the fold lazy-loads. */
@Component({
  selector: 'abc-hero-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, ResponsiveImage],
  template: `
    @if (hero(); as hero) {
      <section class="bg-brand-navy text-white" aria-labelledby="hero-heading">
        <div class="max-w-6xl mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div class="prose-reset flex flex-col gap-5">
            <span class="text-brand-gold text-sm tracking-wide uppercase">{{ hero.eyebrow }}</span>
            <h1 id="hero-heading" class="font-serif text-4xl lg:text-5xl leading-tight">{{ hero.heading }}</h1>
            <p class="italic text-white/80">{{ hero.subheading }}</p>
            <p class="text-white/90 max-w-prose">{{ hero.body }}</p>
            <div class="flex flex-wrap gap-3 mt-2">
              <a href="#pricing" class="bg-brand-gold text-brand-navy rounded px-5 py-3">{{ 'common.viewPlans' | transloco }}</a>
              <a href="#how" class="border border-white/40 rounded px-5 py-3">{{ 'common.howItWorks' | transloco }}</a>
            </div>
            <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-white/20 pt-6">
              @for (stat of stats(); track stat.key) {
                <div>
                  <dt class="sr-only">{{ stat.body }}</dt>
                  <dd class="text-2xl font-semibold">{{ stat.title }}</dd>
                  <dd class="text-sm text-white/70">{{ stat.body }}</dd>
                </div>
              }
            </dl>
          </div>
          <div class="relative hidden lg:block">
            @if (hero.image; as image) {
              <!-- The LCP element on every page: the only image marked priority, so the browser
                   fetches it eagerly instead of deferring it behind lazy-loaded ones. Rendered
                   only at lg and above (the wrapper is hidden below it), hence the fixed slot
                   width rather than a viewport-relative one. -->
              <abc-responsive-image
                [media]="image"
                [priority]="true"
                sizes="(min-width: 1024px) 590px, 0px"
                imgClass="rounded-card shadow-card w-full h-auto"
              />
            } @else {
              <div class="rounded-card shadow-card bg-white/10 aspect-[1180/760]" aria-hidden="true"></div>
            }
            @if (badge(); as badge) {
              <div class="absolute -bottom-4 left-6 bg-white text-brand-navy rounded-card shadow-card px-4 py-3">
                <b class="block text-sm">{{ badge.title }}</b>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class HeroSection {
  private readonly store = inject(SiteContentStore);

  protected readonly hero = this.store.section('hero');
  protected readonly stats = computed(() =>
    (this.hero()?.items ?? []).filter((item) => item.key.startsWith('stat-')),
  );
  protected readonly badge = computed(() =>
    (this.hero()?.items ?? []).find((item) => item.key.startsWith('badge-')),
  );
}
