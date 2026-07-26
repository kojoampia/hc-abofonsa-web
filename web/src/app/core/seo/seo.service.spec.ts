import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SeoService } from './seo.service';
import { SiteContent } from '../api/site-content.model';

const content: SiteContent = {
  locale: 'es',
  generatedAt: '2026-07-26T00:00:00Z',
  siteSettings: {
    organisationName: 'Abofonsa BridgeCare',
    tagline: 'Proporcionando tranquilidad más allá de las fronteras',
    phones: ['+233 302 717 577'],
    whatsapp: '+233 242 286 304',
    email: 'info@abofonsa.com',
    address: { street: 'Ankobra River Street #5', district: 'Teshie Nungua Estates', city: 'Accra', country: 'Ghana' },
    coordinationHours: 'Lunes a sábado, 07:00–19:00 GMT',
    onCallHours: '24 horas',
  },
  sections: {},
  services: [
    { id: '1', slug: 's', name: 'Servicio', blurb: 'b', points: [], availableOn: '', image: null, displayOrder: 1 },
  ],
  plans: [
    {
      id: 'p1',
      code: 'PEAR',
      name: 'Plan PEAR',
      forWho: 'x',
      priceAmount: '3.000',
      priceCurrency: 'GHS',
      priceNote: '',
      featured: false,
      features: [],
      comparison: { visitsPerWeek: '', medicalSupport: '', auxiliary: '', telemetry: '', reporting: '', careManager: '' },
      displayOrder: 1,
    },
  ],
  testimonials: [],
  faqs: [{ id: 'f1', question: '¿Qué?', answer: 'Eso.', displayOrder: 1 }],
};

describe('SeoService (spec §6.3)', () => {
  let service: SeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(SeoService);
    service.apply('es', content);
  });

  it('emits hreflang alternates for all four locales plus x-default', () => {
    const alternates = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) =>
      l.getAttribute('hreflang'),
    );
    expect(alternates.sort()).toEqual(['de', 'en', 'es', 'fr', 'x-default'].sort());
  });

  it('canonical points at the locale-prefixed URL on the origin actually serving the page', () => {
    // Derived from the document's own location rather than a hard-coded constant: a canonical that
    // names a different origin tells search engines to index somewhere this page is not.
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${location.origin}/es`,
    );
  });

  it('marks the page noindex unless the deployment opted in', () => {
    // SITE_INDEXABLE defaults to false, so an unconfigured deployment excludes itself.
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
  });

  it('injects valid JSON-LD including MedicalBusiness, Offer with GHS, and FAQPage', () => {
    const scripts = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent ?? '{}'),
    );
    expect(scripts.some((g) => g['@type'] === 'MedicalBusiness' && g.areaServed === 'Greater Accra')).toBe(true);
    expect(scripts.some((g) => g['@type'] === 'Offer' && g.priceCurrency === 'GHS')).toBe(true);
    expect(scripts.some((g) => g['@type'] === 'FAQPage' && g.mainEntity.length === 1)).toBe(true);
  });

  it('re-applying replaces rather than accumulates head elements', () => {
    service.apply('en', content);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${location.origin}/`,
    );
  });
});
