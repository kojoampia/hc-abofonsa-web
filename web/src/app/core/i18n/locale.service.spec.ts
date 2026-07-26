import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST, provideZonelessChangeDetection } from '@angular/core';
import { LocaleService } from './locale.service';

describe('LocaleService (spec §10.4)', () => {
  let service: LocaleService;

  beforeEach(() => {
    document.cookie = 'abofonsa_locale=;path=/;max-age=0';
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(LocaleService);
  });

  it('defaults to English', () => {
    expect(service.current()).toBe('en');
  });

  it('use() updates the signal, <html lang> and the one-year functional cookie', () => {
    service.use('fr');
    expect(service.current()).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.cookie).toContain('abofonsa_locale=fr');
  });

  it('fromCookie() returns a remembered supported locale and rejects garbage', () => {
    document.cookie = 'abofonsa_locale=de;path=/';
    expect(service.fromCookie()).toBe('de');
    document.cookie = 'abofonsa_locale=xx;path=/';
    expect(service.fromCookie()).toBeNull();
  });

  it('fromNavigator() maps regional tags to their base locale', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-MX', 'en-US']);
    expect(service.fromNavigator()).toBe('es');
  });

  it('pathPrefix() is empty for English and /xx for the rest (spec §5.4)', () => {
    expect(service.pathPrefix('en')).toBe('');
    expect(service.pathPrefix('de')).toBe('/de');
  });
});

/**
 * On the server the same two resolution steps have to come off the incoming request: Angular's
 * server DOM throws `NotYetImplemented` for `document.cookie`, and there is no `navigator`. Getting
 * this wrong took down SSR entirely, so each server branch is pinned here.
 */
describe('LocaleService on the server (spec §10.4)', () => {
  function serverService(headers: Record<string, string>): LocaleService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: new Request('http://localhost/', { headers }) },
      ],
    });
    return TestBed.inject(LocaleService);
  }

  it('reads the remembered locale from the request Cookie header', () => {
    expect(serverService({ cookie: 'other=1; abofonsa_locale=fr; another=2' }).fromCookie()).toBe('fr');
  });

  it('ignores an unsupported cookie value', () => {
    expect(serverService({ cookie: 'abofonsa_locale=xx' }).fromCookie()).toBeNull();
  });

  it('picks the highest-quality supported Accept-Language tag, not merely the first', () => {
    // German is listed last but outranks the unsupported Italian ahead of it.
    expect(serverService({ 'accept-language': 'it-IT,it;q=0.9,de-DE;q=0.95' }).fromNavigator()).toBe('de');
  });

  it('treats a tag without an explicit q as quality 1', () => {
    expect(serverService({ 'accept-language': 'es-MX,en;q=0.5' }).fromNavigator()).toBe('es');
  });

  it('skips q=0 tags, which explicitly reject a language', () => {
    expect(serverService({ 'accept-language': 'fr;q=0,de;q=0.3' }).fromNavigator()).toBe('de');
  });

  it('returns null when neither header is present, leaving the caller on the English default', () => {
    const service = serverService({});
    expect(service.fromCookie()).toBeNull();
    expect(service.fromNavigator()).toBeNull();
  });

  it('use() sets <html lang> but writes no cookie on the server', () => {
    const service = serverService({});
    service.use('de');
    expect(service.current()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });
});
