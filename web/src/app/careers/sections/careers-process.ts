import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CareersContentStore } from '../careers-content.store';

/**
 * Task 136 — what happens after you apply.
 *
 * The four items render the status model of
 * `hc-professional/web/professional-onboarding-workflow.md` in plain language:
 * `account_created → account_activated` (1), `application_started → profile_completed` (2),
 * `credential_review → returned_for_correction | rejected | approved` (3), and
 * `organization_assigned → authority_assigned → roster_configured → active` (4).
 *
 * Step 3's copy is the load-bearing one. `returned_for_correction` is a real state and it is not a
 * rejection — a candidate who does not know that reads silence as failure and stops replying, which
 * is how good applicants are lost between systems.
 *
 * No duration is stated anywhere: step 7 of that workflow has no SLA and no named owner
 * (careers-plan.md D-4), and a plausible-sounding guess is the kind of promise that gets quoted
 * back later.
 */
@Component({
  selector: 'abc-careers-process',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (section(); as process) {
      <section class="py-16" aria-labelledby="careers-process-heading">
        <div class="max-w-6xl mx-auto px-4 prose-reset flex flex-col gap-6">
          @if (process.eyebrow) {
            <p class="text-brand-gold-ink text-sm uppercase tracking-wide">{{ process.eyebrow }}</p>
          }
          <h2 id="careers-process-heading" class="font-serif text-3xl text-brand-navy">{{ process.heading }}</h2>
          @if (process.subheading) {
            <p class="text-brand-body">{{ process.subheading }}</p>
          }
          <ol class="grid md:grid-cols-4 gap-6 mt-2 list-none p-0">
            @for (step of process.items; track step.key) {
              <li class="prose-reset">
                <b class="text-brand-navy block">{{ step.title }}</b>
                <p class="text-sm text-brand-body mt-1 leading-relaxed">{{ step.body }}</p>
              </li>
            }
          </ol>
        </div>
      </section>
    }
  `,
})
export class CareersProcess {
  private readonly store = inject(CareersContentStore);
  protected readonly section = this.store.section('careersProcess');
}
