import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { PlanPricePipe } from '../../shared/pipes/price.pipe';
import { Plan, PlanComparison } from '../../core/api/site-content.model';

const COMPARISON_ROWS: Array<{ key: keyof PlanComparison; labelKey: string }> = [
  { key: 'visitsPerWeek', labelKey: 'pricing.rows.visits' },
  { key: 'medicalSupport', labelKey: 'pricing.rows.medical' },
  { key: 'auxiliary', labelKey: 'pricing.rows.auxiliary' },
  { key: 'telemetry', labelKey: 'pricing.rows.telemetry' },
  { key: 'reporting', labelKey: 'pricing.rows.reporting' },
  { key: 'careManager', labelKey: 'pricing.rows.careManager' },
];

/** Spec §6 #13 — the feature comparison, derived from the same `plans` array as the cards. */
@Component({
  selector: 'abc-pricing-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PlanPricePipe],
  template: `
    @if (store.plans().length > 0) {
      <section class="pb-16" aria-labelledby="comparison-caption">
        <div class="max-w-6xl mx-auto px-4 overflow-x-auto">
          <table class="w-full text-sm border-collapse min-w-[640px]">
            <caption id="comparison-caption" class="text-left text-brand-muted pb-4">
              {{ 'pricing.comparisonCaption' | transloco }}
            </caption>
            <thead>
              <tr>
                <th scope="col" class="text-left p-3 border-b border-brand-line">
                  {{ 'pricing.featureColumn' | transloco }}
                </th>
                @for (plan of store.plans(); track plan.id) {
                  <th scope="col" class="text-left p-3 border-b border-brand-line text-brand-navy">{{ plan.name }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.key) {
                <tr>
                  <th scope="row" class="text-left p-3 border-b border-brand-line font-medium">
                    {{ row.labelKey | transloco }}
                  </th>
                  @for (plan of store.plans(); track plan.id) {
                    <td class="p-3 border-b border-brand-line">{{ comparisonValue(plan, row.key) }}</td>
                  }
                </tr>
              }
              <tr>
                <th scope="row" class="text-left p-3 font-medium">{{ 'pricing.rows.basePrice' | transloco }}</th>
                @for (plan of store.plans(); track plan.id) {
                  <td class="p-3 font-semibold text-brand-navy">
                    {{ plan | planPrice }} {{ 'pricing.perMonth' | transloco }}
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class PricingTable {
  protected readonly store = inject(SiteContentStore);
  protected readonly rows = COMPARISON_ROWS;

  protected comparisonValue(plan: Plan, key: keyof PlanComparison): string {
    return plan.comparison?.[key] ?? '';
  }
}
