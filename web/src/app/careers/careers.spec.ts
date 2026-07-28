import { TestBed } from '@angular/core/testing';
import { ApplicationRef, provideZonelessChangeDetection, signal } from '@angular/core';
import { of } from 'rxjs';
import { CareersContentStore, PROFESSIONAL_PORTAL, handoffUrl } from './careers-content.store';
import { ContentApi } from '../core/api/content.api';
import { LocaleService } from '../core/i18n/locale.service';
import { CareerTrack, CareersContent } from '../core/api/site-content.model';

function track(overrides: Partial<CareerTrack> = {}): CareerTrack {
  return {
    id: '1',
    slug: 'registered-nurse',
    title: 'Registered nurse',
    blurb: 'Clinical visits in patients homes.',
    requirements: ['Current NMC licence'],
    documents: ['Ghana Card or passport'],
    authorityRole: 'ROLE_NURSE',
    openings: true,
    displayOrder: 1,
    ...overrides,
  };
}

/**
 * The handoff is the whole point of the careers page, and it is a cross-domain link — there is no
 * shared session with professional.abofonsa.com, so whatever that side needs has to survive in the
 * URL. These pin the contract described in careers-plan.md §5.
 */
describe('handoffUrl (careers-plan.md §5)', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('carries the track, the locale and the attribution source', () => {
    const url = new URL(handoffUrl(`${PROFESSIONAL_PORTAL}/register`, track(), 'fr'));

    expect(url.origin).toBe(PROFESSIONAL_PORTAL);
    expect(url.pathname).toBe('/register');
    // Without `track` the candidate is asked to choose their role a second time.
    expect(url.searchParams.get('track')).toBe('ROLE_NURSE');
    // Without `locale` they are dropped back into English mid-application.
    expect(url.searchParams.get('locale')).toBe('fr');
    // Without `src` the funnel cannot be joined and nobody can tell whether this page works.
    expect(url.searchParams.get('src')).toBe('web-careers');
  });

  it('sends the authority role, not the slug — that is what the other side authorizes against', () => {
    const url = new URL(handoffUrl(`${PROFESSIONAL_PORTAL}/register`, track({ slug: 'care-assistant', authorityRole: 'ROLE_CARER' }), 'en'));
    expect(url.searchParams.get('track')).toBe('ROLE_CARER');
  });

  it('omits the track for the page-level call to action rather than guessing one', () => {
    const url = new URL(handoffUrl(`${PROFESSIONAL_PORTAL}/register`, null, 'en'));
    expect(url.searchParams.has('track')).toBe(false);
    expect(url.searchParams.get('src')).toBe('web-careers');
  });

  it('preserves a query string already present on a CMS-supplied invitation URL', () => {
    // An editor may paste a URL that already carries parameters; appending must not destroy them.
    const url = new URL(handoffUrl('https://professional.abofonsa.com/invite?ref=partner', track(), 'de'));
    expect(url.searchParams.get('ref')).toBe('partner');
    expect(url.searchParams.get('locale')).toBe('de');
  });
});

/**
 * Careers copy is seeded English-only (careers-plan.md D-5), so `/es/careers` renders English prose
 * inside `<html lang="es">` — a WCAG 2.2 AA failure under 3.1.2 that no automated checker detects,
 * because deciding whether text matches its declared language means reading the text. The server
 * reports the language it actually served; this turns that into an attribute, or into nothing.
 */
describe('CareersContentStore.contentLang', () => {
  async function storeFor(
    payload: Partial<CareersContent> | null,
    pageLocale = 'es',
  ): Promise<CareersContentStore> {
    const content: CareersContent | null = payload && {
      locale: pageLocale,
      contentLanguage: 'en',
      generatedAt: new Date().toISOString(),
      sections: {},
      tracks: [],
      faqs: [],
      ...payload,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LocaleService, useValue: { current: signal(pageLocale) } },
        { provide: ContentApi, useValue: { careersContent: () => of(content) } },
      ],
    });
    const store = TestBed.inject(CareersContentStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  }

  it('reports the served language when it differs from the page, so the region can be marked', async () => {
    expect((await storeFor({ contentLanguage: 'en' }, 'es')).contentLang()).toBe('en');
  });

  it('reports nothing when the content is in the page language — no attribute is the correct output', async () => {
    expect((await storeFor({ contentLanguage: 'es' }, 'es')).contentLang()).toBe(null);
  });

  it('reports nothing on an English page, where the two always agree', async () => {
    expect((await storeFor({ contentLanguage: 'en' }, 'en')).contentLang()).toBe(null);
  });

  /**
   * Not a hardcoded 'en'. The day an editor translates the careers content the server starts
   * reporting the requested locale and these attributes vanish on their own — where a literal would
   * leave Spanish copy labelled English, with nothing left to prompt anyone to remove it.
   */
  it('stops marking once the content is genuinely translated', async () => {
    expect((await storeFor({ contentLanguage: 'fr' }, 'fr')).contentLang()).toBe(null);
  });

  it('...and marks the same page while the content is still English', async () => {
    expect((await storeFor({ contentLanguage: 'en' }, 'fr')).contentLang()).toBe('en');
  });

  it('marks nothing before the payload has arrived, rather than guessing', async () => {
    expect((await storeFor(null, 'de')).contentLang()).toBe(null);
  });
});
