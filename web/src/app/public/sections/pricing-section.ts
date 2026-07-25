import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { PlanPricePipe } from '../../shared/pipes/price.pipe';

/** Spec §6 #12 — the three plan cards, derived from the same `plans` array as the comparison
 * table below it, so the two can never disagree. */
@Component({
  selector: 'abc-pricing-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PlanPricePipe],
  template: `
    <section id="pricing" class="py-16" aria-labelledby="pricing-heading">
      <div class="max-w-6xl mx-auto px-4">
        <h2 id="pricing-heading" class="font-serif text-3xl text-brand-navy mb-10">
          {{ 'nav.pricing' | transloco }}
        </h2>
        <div class="grid lg:grid-cols-3 gap-6 items-stretch">
          @for (plan of store.plans(); track plan.id) {
            <article
              class="rounded-card shadow-card bg-brand-surface p-7 flex flex-col gap-4 border"
              [class.border-brand-gold]="plan.featured"
              [class.border-brand-line]="!plan.featured"
              [attr.data-plan]="plan.code"
            >
              @if (plan.featured) {
                <span class="self-start text-xs font-bold uppercase tracking-wide bg-brand-gold text-white rounded px-2 py-1">
                  {{ 'pricing.mostChosen' | transloco }}
                </span>
              }
              <h3 class="text-xl text-brand-navy prose-reset">{{ plan.name }}</h3>
              <p class="text-sm text-brand-body prose-reset">{{ plan.forWho }}</p>
              <p class="prose-reset">
                <span class="text-3xl font-semibold text-brand-navy" data-testid="plan-price">{{ plan | planPrice }}</span>
                <span class="text-brand-muted text-sm"> {{ 'pricing.perMonth' | transloco }}</span>
              </p>
              <ul class="grid gap-2 list-none m-0 p-0 text-sm flex-1">
                @for (feature of plan.features; track feature.label) {
                  <li class="flex gap-2 items-start" [class.text-brand-muted]="!feature.included">
                    <span aria-hidden="true" [class.text-brand-ok]="feature.included">{{ feature.included ? '✓' : '—' }}</span>
                    <span class="sr-only">{{ (feature.included ? 'pricing.included' : 'pricing.notIncluded') | transloco }}:</span>
                    <span [class.font-semibold]="feature.emphasised">{{ feature.label }}</span>
                  </li>
                }
              </ul>
              <p class="text-xs text-brand-muted prose-reset">{{ plan.priceNote }}</p>
              <a href="#contact" class="text-center bg-brand-navy text-white rounded px-4 py-3">
                {{ 'pricing.enquireAbout' | transloco: { plan: plan.name } }}
              </a>
            </article>
          }
        </div>
        <p class="text-xs text-brand-muted mt-6">{{ 'pricing.priceFootnote' | transloco }}</p>
      </div>
    </section>
  `,
})
export class PricingSection {
  protected readonly store = inject(SiteContentStore);
}
