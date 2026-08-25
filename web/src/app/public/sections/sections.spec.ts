import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { contentApiStub, makeSiteContent, translocoTesting } from '../../testing/site-content.fixture';
import { HeroSection } from './hero-section';
import { AssuranceBar } from './assurance-bar';
import { ProcessSteps } from './process-steps';
import { ApproachSection } from './approach-section';
import { StatsBand } from './stats-band';
import { AngelNetworkSection } from './angel-network-section';
import { CtaBand } from './cta-band';
import { ProfessionalCta } from './professional-cta';
import { PatientOfferBand } from './patient-offer-band';
import { TopContactStrip } from './top-contact-strip';
import { SiteFooter } from './site-footer';
import { SiteContent } from '../../core/api/site-content.model';

async function render<T>(component: new () => T, content?: SiteContent): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [component as never, translocoTesting()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), contentApiStub(content)],
  }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('static content sections (spec §6)', () => {
  it('HeroSection renders eyebrow, heading, stats and the badge from the hero section content', async () => {
    const fixture = await render(HeroSection);
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Hospital-grade care, delivered to the door.');
    expect(text).toContain('Abofonsa means "Angelic Hands".');
    expect(text).toContain('99%');
    expect(text).toContain('Shift fulfilment');
    expect(text).toContain('Vetted professionals');
  });

  it('AssuranceBar renders one item per assurance entry', async () => {
    const fixture = await render(AssuranceBar);
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(2);
  });

  it('ProcessSteps renders the four numbered steps in order', async () => {
    const fixture = await render(ProcessSteps);
    const steps = fixture.nativeElement.querySelectorAll('ol li');
    expect(steps.length).toBe(4);
    expect(steps[0].textContent).toContain('Consultation');
    expect(steps[3].textContent).toContain('Care begins');
  });

  it('ApproachSection renders heading and features', async () => {
    const fixture = await render(ApproachSection);
    expect(fixture.nativeElement.textContent).toContain('Care that is coordinated, not improvised');
    expect(fixture.nativeElement.textContent).toContain('Scheduling that holds');
  });

  it('StatsBand renders the statistics', async () => {
    const fixture = await render(StatsBand);
    expect(fixture.nativeElement.textContent).toContain('Shift fulfilment rate');
  });

  it('AngelNetworkSection renders the angel features', async () => {
    const fixture = await render(AngelNetworkSection);
    expect(fixture.nativeElement.textContent).toContain('Someone is always accountable');
  });

  it('CtaBand renders the closing call to action with the phone number', async () => {
    const fixture = await render(CtaBand);
    expect(fixture.nativeElement.textContent).toContain("Discuss your family's needs with a nurse");
    expect(fixture.nativeElement.querySelector('a[href^="tel:"]')?.textContent).toContain('+233 302 717 577');
  });

  it('TopContactStrip shows the primary phone and email from siteSettings', async () => {
    const fixture = await render(TopContactStrip);
    expect(fixture.nativeElement.textContent).toContain('+233 302 717 577');
    expect(fixture.nativeElement.textContent).toContain('info@abofonsa.com');
  });

  it('PatientOfferBand pitches the offer and states its terms in the same band', async () => {
    const fixture = await render(PatientOfferBand);
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('pay nothing for the first month');
    // The conditions travel with the claim. A promotion whose terms live one scroll away is the
    // kind of thing that gets read back to you later.
    expect(text).toContain('minimum three-month term');
  });

  it('PatientOfferBand sends a family to the patient portal, at the path that portal actually uses', async () => {
    const fixture = await render(PatientOfferBand);
    const url = new URL(fixture.nativeElement.querySelector('[data-testid="patient-signup"]').getAttribute('href'));

    expect(url.origin).toBe('https://patient.abofonsa.com');
    // /account/register, not /register — the patient app mounts its public account screens under
    // `account`, and both apps answer 200 on any path, so getting this wrong would look fine.
    expect(url.pathname).toBe('/account/register');
    expect(url.searchParams.get('locale')).toBe('en');
    expect(url.searchParams.get('src')).toBe('web-home');
  });

  /**
   * Two independent switches, and neither failure mode is a broken page: the offer is content and
   * the door is configuration.
   */
  it('PatientOfferBand keeps the offer when no portal is configured, losing only the button', async () => {
    const content = makeSiteContent();
    content.siteSettings.patientPortalUrl = null;

    const fixture = await render(PatientOfferBand, content);

    expect(fixture.nativeElement.querySelector('[data-testid="patient-signup"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('pay nothing for the first month');
    // ...and the consultation route survives, so the band still leads somewhere.
    expect(fixture.nativeElement.querySelector('[data-testid="patient-offer-enquiry"]')).not.toBeNull();
  });

  it('PatientOfferBand disappears entirely when the offer section is withdrawn', async () => {
    const content = makeSiteContent();
    delete content.sections['patientOffer'];

    const fixture = await render(PatientOfferBand, content);

    expect(fixture.nativeElement.querySelector('[data-testid="patient-offer-band"]')).toBeNull();
  });

  it('ProfessionalCta gives clinicians a route off the landing page', async () => {
    const fixture = await render(ProfessionalCta);
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('Join the clinicians behind BridgeCare');
    // The document list is the whole reason /careers exists; the direct route must still say what
    // to bring, or it just moves unprepared applications further down the queue.
    expect(text).toContain('Ghana Card or passport');
    expect(fixture.nativeElement.querySelector('[data-testid="home-careers-cta"]').getAttribute('href')).toBe(
      '/careers',
    );
  });

  /**
   * The same CMS field that switches the careers page's eight apply buttons switches this one, so
   * there is no state where the home page promises a door the careers page withholds.
   */
  it('ProfessionalCta shows no registration link while the CMS has no portal configured', async () => {
    const fixture = await render(ProfessionalCta);

    expect(fixture.nativeElement.querySelector('[data-testid="home-apply"]')).toBeNull();
    // ...and the surviving link takes the primary styling rather than sitting alone looking disabled.
    expect(fixture.nativeElement.querySelector('[data-testid="home-careers-cta"]').className).toContain(
      'bg-brand-navy',
    );
  });

  it('ProfessionalCta links straight to registration once a portal is configured, with its own attribution', async () => {
    const content = makeSiteContent();
    content.siteSettings.professionalPortalUrl = 'https://professional.abofonsa.com/';

    const fixture = await render(ProfessionalCta, content);
    const href = fixture.nativeElement.querySelector('[data-testid="home-apply"]').getAttribute('href');
    const url = new URL(href);

    expect(url.origin).toBe('https://professional.abofonsa.com');
    // A trailing slash in the CMS value must not become //register.
    expect(url.pathname).toBe('/register');
    expect(url.searchParams.get('locale')).toBe('en');
    // web-home, not web-careers: the far end is the only place that can tell which of the two
    // arguments converts (careers-plan.md §8), and it can only tell if they arrive distinguishable.
    expect(url.searchParams.get('src')).toBe('web-home');
    // No track: the home page never asked which role they hold, and a guessed one would arrive in
    // the credentialing queue as fact.
    expect(url.searchParams.has('track')).toBe(false);
  });

  it('SiteFooter derives its service links from the services array, never hardcoded', async () => {
    const fixture = await render(SiteFooter);
    const serviceLinks = fixture.nativeElement.querySelectorAll('nav:first-of-type li a');
    expect(serviceLinks.length).toBe(6);
    expect(serviceLinks[0].textContent).toContain('Service 1');
  });
});
