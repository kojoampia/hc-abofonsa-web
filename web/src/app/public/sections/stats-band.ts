import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #10 — the four statistics band. */
@Component({
  selector: 'abc-stats-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stats(); as stats) {
      <section class="bg-brand-navy text-white" aria-label="Key statistics">
        <dl class="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 m-0">
          @for (stat of stats.items; track stat.key) {
            <div class="text-center prose-reset">
              <dd class="text-3xl font-semibold">{{ stat.title }}</dd>
              <dt class="text-sm text-white/70 mt-1">{{ stat.body }}</dt>
            </div>
          }
        </dl>
      </section>
    }
  `,
})
export class StatsBand {
  protected readonly stats = inject(SiteContentStore).section('stats');
}
