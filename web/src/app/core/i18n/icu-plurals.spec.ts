import MessageFormat from '@messageformat/core';
import fr from '../../../../public/i18n/fr.json';
import de from '../../../../public/i18n/de.json';
import en from '../../../../public/i18n/en.json';

/**
 * Spec §10.6: plural categories differ by language — CLDR French puts 0 and 1 in the `one`
 * category, German puts 0 in `other`. These tests run the real shipped bundle values through the
 * same MessageFormat engine Transloco uses, proving the ICU syntax (not string concatenation)
 * carries that difference.
 */
describe('ICU pluralisation (spec §10.6)', () => {
  const format = (locale: string, message: string, count: number) =>
    new MessageFormat(locale).compile(message)({ count });

  it('French renders count 0 with the singular category, German with the plural', () => {
    expect(format('fr', fr.services.slideCount, 0)).toBe('0 service'); // fr: 0 is `one`
    expect(format('de', de.services.slideCount, 0)).toBe('0 Leistungen'); // de: 0 is `other`
  });

  it('both languages agree on 1 and on many', () => {
    expect(format('fr', fr.services.slideCount, 1)).toBe('1 service');
    expect(format('de', de.services.slideCount, 1)).toBe('1 Leistung');
    expect(format('fr', fr.services.slideCount, 6)).toBe('6 services');
    expect(format('de', de.services.slideCount, 6)).toBe('6 Leistungen');
  });

  it('the explicit =0 branch overrides the category for the FAQ empty state', () => {
    expect(format('en', en.faq.resultCount, 0)).toBe('No questions match');
    expect(format('fr', fr.faq.resultCount, 0)).toBe('Aucune question ne correspond');
    expect(format('de', de.faq.resultCount, 0)).toBe('Keine Frage gefunden');
  });
});
