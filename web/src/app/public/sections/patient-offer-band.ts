import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { patientRegisterUrlFor } from '../../core/api/professional-handoff';

/**
 * The landing page's offer to families: the first month of care is free, and here is the door.
 *
 * Placed high — directly under the hero — because it is an offer, and an offer three screens down is
 * a footnote. That is the opposite of where the professional band sits, and deliberately so: this one
 * speaks to the audience the page is already for, so it interrupts nothing.
 *
 * **The copy is CMS content, the button is configuration, and the two are independent.** The heading,
 * pitch and terms come from the `patientOffer` section, so an editor can amend or withdraw the offer
 * by unpublishing a document — a promotion that cannot be pulled without a release is a liability,
 * not a feature. The button comes from `siteSettings.patientPortalUrl`, so if patient.abofonsa.com
 * stops answering the door closes while the page keeps making sense. Neither state is broken: offer
 * without button reads as "call us", button without offer is simply a sign-up link.
 *
 * The terms sit inside the band rather than a scroll away, next to the claim they qualify. The
 * pricing cards below still say "minimum three-month term · 30 days' notice" and remain true — a free
 * first month shortens nobody's commitment, and the band says so in the same breath as the offer
 * rather than leaving a visitor to reconcile two pages.
 */
@Component({
  selector: 'abc-patient-offer-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (offer(); as offer) {
      <section
        id="offer"
        class="bg-brand-navy text-white py-14"
        aria-labelledby="offer-heading"
        data-testid="patient-offer-band"
      >
        <div class="max-w-6xl mx-auto px-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div class="prose-reset flex flex-col gap-3">
            @if (offer.eyebrow) {
              <span class="text-brand-gold text-sm tracking-wide uppercase">{{ offer.eyebrow }}</span>
            }
            <h2 id="offer-heading" class="font-serif text-3xl lg:text-4xl leading-tight">{{ offer.heading }}</h2>
            @if (offer.subheading) {
              <p class="text-white/90 max-w-prose">{{ offer.subheading }}</p>
            }
            @if (offer.body) {
              <!-- The conditions, beside the claim rather than a scroll below it. -->
              <p class="text-white/70 text-sm max-w-prose">{{ offer.body }}</p>
            }
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            @if (registerUrl(); as href) {
              <a
                [href]="href"
                rel="noopener"
                data-testid="patient-signup"
                class="bg-brand-gold text-brand-navy rounded px-5 py-3 inline-flex items-center min-h-11 font-medium"
              >
                {{ 'patient.createAccount' | transloco }}
              </a>
            }
            <a
              href="#contact"
              data-testid="patient-offer-enquiry"
              class="border border-white/40 rounded px-5 py-3 inline-flex items-center min-h-11 font-medium"
            >
              {{ 'common.requestConsultation' | transloco }}
            </a>
          </div>
        </div>
      </section>
    }
  `,
})
export class PatientOfferBand {
  private readonly store = inject(SiteContentStore);
  private readonly locale = inject(LocaleService);

  /** Null while the section is unpublished — which is how the offer is withdrawn. */
  protected readonly offer = this.store.section('patientOffer');

  protected readonly registerUrl = computed(() =>
    patientRegisterUrlFor(this.store.settings()?.patientPortalUrl, this.locale.current()),
  );
}
