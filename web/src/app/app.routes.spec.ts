import { UrlSegment } from '@angular/router';
import { localeRouteMatcher } from './app.routes';

describe('localeRouteMatcher (spec §5.4)', () => {
  const segments = (...paths: string[]) => paths.map((p) => new UrlSegment(p, {}));

  it('matches the three non-English locales as a consumed prefix', () => {
    for (const locale of ['es', 'fr', 'de']) {
      const result = localeRouteMatcher(segments(locale));
      expect(result).not.toBeNull();
      expect(result!.consumed[0].path).toBe(locale);
      expect(result!.posParams!['locale'].path).toBe(locale);
    }
  });

  it('does not match an unsupported code - /xx reaches the 404 route', () => {
    expect(localeRouteMatcher(segments('xx'))).toBeNull();
    expect(localeRouteMatcher(segments('it'))).toBeNull();
  });

  it('does not consume the default locale as a prefix - / serves English', () => {
    expect(localeRouteMatcher(segments('en'))).toBeNull();
  });

  it('does not match the admin path', () => {
    expect(localeRouteMatcher(segments('admin'))).toBeNull();
  });
});
