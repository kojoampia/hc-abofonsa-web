import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentApi } from '../../core/api/content.api';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { EnquiryReceipt } from '../../core/api/site-content.model';

/**
 * Spec §6 #17 — contact details + the enquiry form on Material controls, mirroring the backend's
 * Bean Validation. The hidden `company` honeypot and the dwell-time measurement feed the §7.7
 * anti-abuse checks; the consent checkbox is the §13.3 lawful basis.
 */
@Component({
  selector: 'abc-contact-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    TranslocoPipe,
  ],
  template: `
    <section id="contact" class="py-16" aria-labelledby="contact-heading">
      <div class="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
        <div class="prose-reset flex flex-col gap-5">
          <h2 id="contact-heading" class="font-serif text-3xl text-brand-navy">{{ 'form.heading' | transloco }}</h2>
          <p class="text-brand-body">{{ 'form.intro' | transloco }}</p>
          @if (store.settings(); as settings) {
            <address class="not-italic grid gap-3 text-sm text-brand-body">
              <p class="prose-reset">
                <b class="text-brand-navy block">{{ 'topbar.phoneLabel' | transloco }}</b>
                @for (phone of settings.phones; track phone) {
                  <a class="flex items-center min-h-6 hover:underline" href="tel:{{ phone }}">{{ phone }}</a>
                }
              </p>
              <p class="prose-reset">
                <b class="text-brand-navy block">{{ 'topbar.emailLabel' | transloco }}</b>
                <a class="hover:underline" href="mailto:{{ settings.email }}">{{ settings.email }}</a>
              </p>
              <p class="prose-reset">
                <b class="text-brand-navy block">{{ 'topbar.officeLabel' | transloco }}</b>
                {{ settings.address.street }}<br />{{ settings.address.district }}, {{ settings.address.city }},
                {{ settings.address.country }}
              </p>
              <p class="prose-reset">{{ settings.coordinationHours }}<br />{{ settings.onCallHours }}</p>
            </address>
          }
        </div>

        @if (receipt(); as done) {
          <div class="rounded-card shadow-card bg-brand-cream p-8 self-start" role="status" data-testid="enquiry-confirmation">
            <h3 class="text-xl text-brand-navy prose-reset">{{ 'form.confirmationTitle' | transloco }}</h3>
            <p class="text-brand-body mt-2">
              {{ 'form.confirmationBody' | transloco: { name: submittedName() } }}
            </p>
            <p class="mt-4 text-sm text-brand-muted">Ref: <b data-testid="enquiry-reference">{{ done.reference }}</b></p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.name' | transloco }}</mat-label>
              <input matInput formControlName="name" [placeholder]="'form.namePlaceholder' | transloco" required maxlength="120" data-testid="enquiry-name" />
              @if (form.controls.name.hasError('required')) {
                <mat-error role="alert">{{ 'form.required' | transloco }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.phone' | transloco }}</mat-label>
              <input matInput formControlName="phone" [placeholder]="'form.phonePlaceholder' | transloco" required maxlength="40" data-testid="enquiry-phone" />
              @if (form.controls.phone.hasError('required')) {
                <mat-error role="alert">{{ 'form.required' | transloco }}</mat-error>
              } @else if (form.controls.phone.hasError('pattern')) {
                <mat-error role="alert">{{ 'form.phoneInvalid' | transloco }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.emailOptional' | transloco }}</mat-label>
              <input matInput type="email" formControlName="email" maxlength="160" data-testid="enquiry-email" />
              @if (form.controls.email.hasError('email')) {
                <mat-error role="alert">{{ 'form.emailInvalid' | transloco }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.plan' | transloco }}</mat-label>
              <mat-select formControlName="planOfInterest" data-testid="enquiry-plan">
                <mat-option value="PEAR">{{ 'form.planOptions.pear' | transloco }}</mat-option>
                <mat-option value="PAWPAW">{{ 'form.planOptions.pawpaw' | transloco }}</mat-option>
                <mat-option value="MELON">{{ 'form.planOptions.melon' | transloco }}</mat-option>
                <mat-option value="UNSURE">{{ 'form.planOptions.unsure' | transloco }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.relation' | transloco }}</mat-label>
              <mat-select formControlName="relationship">
                <mat-option value="parent">{{ 'form.relationOptions.parent' | transloco }}</mat-option>
                <mat-option value="spouse">{{ 'form.relationOptions.spouse' | transloco }}</mat-option>
                <mat-option value="myself">{{ 'form.relationOptions.myself' | transloco }}</mat-option>
                <mat-option value="other">{{ 'form.relationOptions.other' | transloco }}</mat-option>
                <mat-option value="referral">{{ 'form.relationOptions.referral' | transloco }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'form.message' | transloco }}</mat-label>
              <textarea matInput rows="4" formControlName="message" [placeholder]="'form.messagePlaceholder' | transloco" maxlength="4000" data-testid="enquiry-message"></textarea>
            </mat-form-field>

            <!-- Honeypot: visually hidden, excluded from the tab order; bots fill it, people never see it. -->
            <div class="sr-only" aria-hidden="true">
              <label>
                Company
                <input formControlName="company" tabindex="-1" autocomplete="off" />
              </label>
            </div>

            <mat-checkbox formControlName="consent" required data-testid="enquiry-consent">
              {{ 'form.consent' | transloco }}
            </mat-checkbox>
            @if (form.controls.consent.invalid && form.controls.consent.touched) {
              <p class="text-sm text-red-700 -mt-2" role="alert">{{ 'form.consentRequired' | transloco }}</p>
            }

            @if (failed()) {
              <p class="text-sm text-red-700" role="alert">{{ 'error.loadFailed' | transloco }}</p>
            }

            <button mat-flat-button color="primary" type="submit" [disabled]="submitting()" data-testid="enquiry-submit">
              {{ (submitting() ? 'form.submitting' : 'form.submit') | transloco }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
})
export class ContactSection {
  protected readonly store = inject(SiteContentStore);
  private readonly api = inject(ContentApi);
  private readonly locale = inject(LocaleService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  private readonly mountedAt = Date.now();

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-.\s]{7,40}$/)]],
    email: ['', [Validators.email, Validators.maxLength(160)]],
    planOfInterest: [''],
    relationship: [''],
    message: ['', [Validators.maxLength(4000)]],
    company: [''], // honeypot - stays empty
    consent: [false, [Validators.requiredTrue]],
  });

  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  protected readonly submittedName = signal('');

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.failed.set(false);
    this.api
      .submitEnquiry({
        name: value.name,
        phone: value.phone,
        email: value.email || undefined,
        planOfInterest: value.planOfInterest || undefined,
        relationship: value.relationship || undefined,
        message: value.message || undefined,
        locale: this.locale.current(),
        sourcePage: '/#contact',
        consent: value.consent,
        company: value.company || undefined,
        dwellMs: Date.now() - this.mountedAt,
      })
      .subscribe({
        next: (receipt) => {
          this.submittedName.set(value.name);
          this.receipt.set(receipt);
          this.submitting.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.submitting.set(false);
        },
      });
  }
}
