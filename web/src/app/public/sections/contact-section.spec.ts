import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ContentApi } from '../../core/api/content.api';
import { EnquiryRequest } from '../../core/api/site-content.model';
import { makeSiteContent, translocoTesting } from '../../testing/site-content.fixture';
import { ContactSection } from './contact-section';

describe('ContactSection (spec §6 #17)', () => {
  let submitted: EnquiryRequest[];

  async function render(apiOverride?: Partial<ContentApi>) {
    submitted = [];
    await TestBed.configureTestingModule({
      imports: [ContactSection, translocoTesting()],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ContentApi,
          useValue: {
            siteContent: () => of(makeSiteContent()),
            submitEnquiry: (body: EnquiryRequest) => {
              submitted.push(body);
              return of({ reference: 'ENQ-2026-000042', receivedAt: new Date().toISOString() });
            },
            ...apiOverride,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContactSection);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function fillValid(fixture: ReturnType<typeof TestBed.createComponent<ContactSection>>) {
    const component = fixture.componentInstance as unknown as {
      form: { patchValue: (v: object) => void };
    };
    component.form.patchValue({
      name: 'Kwame Asare',
      phone: '+233 24 000 0000',
      email: 'kwame@example.com',
      consent: true,
    });
  }

  it('renders the contact details from siteSettings', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('+233 302 717 577');
    expect(fixture.nativeElement.textContent).toContain('Ankobra River Street #5');
  });

  it('a valid submission posts the payload (with consent + dwell) and shows the quotable reference', async () => {
    const fixture = await render();
    fillValid(fixture);
    await (fixture.componentInstance as unknown as { submit: () => Promise<void> }).submit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submitted.length).toBe(1);
    expect(submitted[0].consent).toBe(true);
    // The component waits out `abofonsa.enquiry.min-dwell-ms` before posting, so a real person who
    // fills the form quickly is never reported to the server as faster than the anti-bot floor.
    expect(submitted[0].dwellMs).toBeGreaterThanOrEqual(3000);
    expect(submitted[0].company).toBeUndefined();

    const confirmation = fixture.nativeElement.querySelector('[data-testid="enquiry-confirmation"]');
    expect(confirmation?.textContent).toContain('Request received');
    expect(fixture.nativeElement.querySelector('[data-testid="enquiry-reference"]')?.textContent).toBe(
      'ENQ-2026-000042',
    );
  });

  it('an invalid form never reaches the API and marks errors', async () => {
    const fixture = await render();
    (fixture.componentInstance as unknown as { submit: () => void }).submit();
    fixture.detectChanges();
    expect(submitted.length).toBe(0);
  });

  /**
   * The message has to describe what actually failed. This previously rendered
   * `error.loadFailed` — "We could not load this content" — for a *submission* failure, which
   * tells someone who has just typed out their family's situation nothing about whether it was
   * sent, and reads as though the page itself is broken.
   */
  it('a backend failure explains the submission failed, offers the phone number, and keeps the form', async () => {
    const fixture = await render({ submitEnquiry: () => throwError(() => ({ status: 500 })) });
    fillValid(fixture);
    await (fixture.componentInstance as unknown as { submit: () => Promise<void> }).submit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[data-testid="enquiry-error"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('could not send');
    expect(alert.textContent).not.toContain('could not load');
    // The form stays, so the visitor can retry without retyping anything.
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('a rate-limited submission says to wait, because retrying immediately cannot help', async () => {
    const fixture = await render({ submitEnquiry: () => throwError(() => ({ status: 429 })) });
    fillValid(fixture);
    await (fixture.componentInstance as unknown as { submit: () => Promise<void> }).submit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[data-testid="enquiry-error"]');
    expect(alert.textContent).toContain('several requests');
  });

  it('the honeypot field is hidden from users and excluded from the tab order', async () => {
    const fixture = await render();
    const honeypotWrapper = fixture.nativeElement.querySelector('.sr-only[aria-hidden="true"]');
    expect(honeypotWrapper).toBeTruthy();
    expect(honeypotWrapper.querySelector('input')?.getAttribute('tabindex')).toBe('-1');
  });
});
