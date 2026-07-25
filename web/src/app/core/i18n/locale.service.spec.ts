import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
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
