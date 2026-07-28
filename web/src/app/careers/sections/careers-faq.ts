import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoPipe } from '@jsverse/transloco';
import { CareersContentStore } from '../careers-content.store';

/** Applicant questions. Same accordion as the home page's FAQ, different source — these come from
 * the careers payload, which is why they cannot appear among the family questions. */
@Component({
  selector: 'abc-careers-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, TranslocoPipe],
  template: `
    @if (store.faqs().length) {
      <section id="careers-faq" class="py-16" aria-labelledby="careers-faq-heading">
        <div class="max-w-4xl mx-auto px-4">
          <h2 id="careers-faq-heading" class="font-serif text-3xl text-brand-navy mb-8">
            {{ 'careers.faqHeading' | transloco }}
          </h2>
          <mat-accordion>
            @for (faq of store.faqs(); track faq.id) {
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ faq.question }}</mat-panel-title>
                </mat-expansion-panel-header>
                <p class="text-brand-body leading-relaxed">{{ faq.answer }}</p>
              </mat-expansion-panel>
            }
          </mat-accordion>
        </div>
      </section>
    }
  `,
})
export class CareersFaq {
  protected readonly store = inject(CareersContentStore);
}
