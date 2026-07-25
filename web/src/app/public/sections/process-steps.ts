import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #8 — the four-step onboarding process. */
@Component({
  selector: 'abc-process-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (process(); as process) {
      <section id="how" class="py-16" aria-labelledby="process-heading">
        <div class="max-w-6xl mx-auto px-4 prose-reset">
          <p class="text-brand-gold text-sm uppercase tracking-wide">{{ process.eyebrow }}</p>
          <h2 id="process-heading" class="font-serif text-3xl text-brand-navy mt-1 mb-10">{{ process.heading }}</h2>
          <ol class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 list-none m-0 p-0">
            @for (step of process.items; track step.key; let i = $index) {
              <li class="prose-reset">
                <span class="inline-flex w-10 h-10 rounded-full bg-brand-navy text-white items-center justify-center font-semibold" aria-hidden="true">
                  {{ i + 1 }}
                </span>
                <h3 class="text-lg text-brand-navy mt-3">{{ step.title }}</h3>
                <p class="text-sm text-brand-body mt-1">{{ step.body }}</p>
              </li>
            }
          </ol>
        </div>
      </section>
    }
  `,
})
export class ProcessSteps {
  protected readonly process = inject(SiteContentStore).section('process');
}
