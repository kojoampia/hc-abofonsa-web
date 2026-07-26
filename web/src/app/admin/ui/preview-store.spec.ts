import { PreviewContentStore } from './preview-store';

/**
 * E-8's correctness hinges on the preview resolving locales exactly like the backend does
 * (requested locale, else English) — otherwise the preview would lie about what publishes.
 */
describe('PreviewContentStore', () => {
  let store: PreviewContentStore;

  beforeEach(() => {
    store = new PreviewContentStore();
  });

  it('resolves the requested locale when present', () => {
    store.setFrom('services', { name: { en: 'Care', fr: 'Soins' }, points: [] }, 'fr');
    expect(store.services()[0].name).toBe('Soins');
  });

  it('falls back to English when the requested locale is missing or blank', () => {
    store.setFrom('services', { name: { en: 'Care', fr: '  ' }, points: [] }, 'fr');
    expect(store.services()[0].name).toBe('Care');

    store.setFrom('services', { name: { en: 'Care' }, points: [] }, 'de');
    expect(store.services()[0].name).toBe('Care');
  });

  it('renders an empty string rather than throwing on a wholly absent field', () => {
    store.setFrom('services', {}, 'en');
    expect(store.services()[0].blurb).toBe('');
    expect(store.services()[0].points).toEqual([]);
  });

  it('maps a plan draft including features and the featured flag', () => {
    store.setFrom(
      'plans',
      {
        code: 'PEAR',
        name: { en: 'PEAR Plan' },
        price: { amount: 3000 },
        featured: true,
        features: [{ label: { en: '5 weekly visits' }, included: true, emphasised: true }],
      },
      'en',
    );
    const plan = store.plans()[0];
    expect(plan.code).toBe('PEAR');
    expect(plan.featured).toBe(true);
    expect(plan.priceCurrency).toBe('GHS');
    expect(plan.features[0].label).toBe('5 weekly visits');
  });

  it('maps a testimonial draft, leaving the proper noun untranslated', () => {
    store.setFrom(
      'testimonials',
      { personName: 'Adwoa Boateng', quote: { en: 'A quote', es: 'Una cita' }, rating: 5 },
      'es',
    );
    const story = store.stories()[0];
    expect(story.personName).toBe('Adwoa Boateng');
    expect(story.quote).toBe('Una cita');
  });

  it('maps an FAQ draft', () => {
    store.setFrom('faqs', { question: { en: 'Q?' }, answer: { en: 'A.' } }, 'en');
    expect(store.faqs()[0].question).toBe('Q?');
  });

  it('keys a section draft by its lowercased section key so the right component renders', () => {
    store.setFrom('sections', { key: 'HERO', heading: { en: 'Hospital-grade care' }, items: [] }, 'en');
    expect(store.section('hero')()?.heading).toBe('Hospital-grade care');
  });

  it('maps section items including their localized title and body', () => {
    store.setFrom(
      'sections',
      { key: 'PROCESS', items: [{ key: 'p1', icon: 'phone', title: { en: 'Consultation' }, body: { en: 'We talk.' } }] },
      'en',
    );
    const items = store.section('process')()?.items ?? [];
    expect(items[0]).toMatchObject({ key: 'p1', icon: 'phone', title: 'Consultation', body: 'We talk.' });
  });

  it('maps site settings including the nested address', () => {
    store.setFrom(
      'settings',
      {
        organisationName: 'Abofonsa BridgeCare',
        tagline: { en: 'Peace of mind' },
        phones: ['+233 302 717 577'],
        email: 'info@abofonsa.com',
        address: { street: 'Ankobra River Street #5', city: 'Accra', country: 'Ghana' },
      },
      'en',
    );
    const settings = store.settings()!;
    expect(settings.organisationName).toBe('Abofonsa BridgeCare');
    expect(settings.address.street).toBe('Ankobra River Street #5');
    expect(settings.phones).toEqual(['+233 302 717 577']);
  });

  it('exposes the SiteContentStore surface the public components depend on', () => {
    store.setFrom('faqs', { question: { en: 'Q?' } }, 'en');
    expect(store.loading()).toBe(false);
    expect(store.failed()).toBe(false);
    expect(() => store.reload()).not.toThrow();
    expect(store.content()?.locale).toBe('en');
  });
});
