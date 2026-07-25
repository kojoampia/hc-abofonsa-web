import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #15 — the FAQ accordion on mat-expansion-panel. */
@Component({
  selector: 'abc-faq-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, TranslocoPipe],
  template: `
    <section id="faq" class="py-16 bg-brand-cream" aria-labelledby="faq-heading">
      <div class="max-w-3xl mx-auto px-4">
        <h2 id="faq-heading" class="font-serif text-3xl text-brand-navy mb-8">{{ 'nav.faq' | transloco }}</h2>
        <mat-accordion displayMode="flat">
          @for (faq of store.faqs(); track faq.id) {
            <mat-expansion-panel class="!shadow-none border-b border-brand-line">
              <mat-expansion-panel-header>
                <mat-panel-title class="text-brand-navy font-medium">{{ faq.question }}</mat-panel-title>
              </mat-expansion-panel-header>
              <p class="text-brand-body text-sm leading-relaxed">{{ faq.answer }}</p>
            </mat-expansion-panel>
          }
        </mat-accordion>
      </div>
    </section>
  `,
})
export class FaqSection {
  protected readonly store = inject(SiteContentStore);
}
