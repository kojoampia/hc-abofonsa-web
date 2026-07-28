import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PROFESSIONAL_PORTAL, handoffUrl } from './careers-content.store';
import { CareerTrack } from '../core/api/site-content.model';

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
