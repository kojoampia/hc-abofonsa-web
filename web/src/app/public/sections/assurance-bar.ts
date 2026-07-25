import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #6 — the four assurance items under the hero. */
@Component({
  selector: 'abc-assurance-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (assurance(); as assurance) {
      <section class="border-b border-brand-line bg-brand-surface" aria-label="Assurances">
        <ul class="max-w-6xl mx-auto px-4 py-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none m-0">
          @for (item of assurance.items; track item.key) {
            <li class="prose-reset">
              <b class="block text-brand-navy">{{ item.title }}</b>
              <p class="text-sm text-brand-muted">{{ item.body }}</p>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class AssuranceBar {
  protected readonly assurance = inject(SiteContentStore).section('assurance');
}
