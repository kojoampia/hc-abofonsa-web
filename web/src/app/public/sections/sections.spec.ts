import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { contentApiStub, translocoTesting } from '../../testing/site-content.fixture';
import { HeroSection } from './hero-section';
import { AssuranceBar } from './assurance-bar';
import { ProcessSteps } from './process-steps';
import { ApproachSection } from './approach-section';
import { StatsBand } from './stats-band';
import { AngelNetworkSection } from './angel-network-section';
import { CtaBand } from './cta-band';
import { TopContactStrip } from './top-contact-strip';
import { SiteFooter } from './site-footer';

async function render<T>(component: new () => T): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [component as never, translocoTesting()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), contentApiStub()],
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

  it('SiteFooter derives its service links from the services array, never hardcoded', async () => {
    const fixture = await render(SiteFooter);
    const serviceLinks = fixture.nativeElement.querySelectorAll('nav:first-of-type li a');
    expect(serviceLinks.length).toBe(6);
    expect(serviceLinks[0].textContent).toContain('Service 1');
  });
});
