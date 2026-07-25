import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PlanPricePipe } from './price.pipe';
import { LocaleService } from '../../core/i18n/locale.service';
import { Locale } from '../../core/i18n/locales';

describe('PlanPricePipe (spec §10.5)', () => {
  let localeService: LocaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), PlanPricePipe],
    });
    localeService = TestBed.inject(LocaleService);
  });

  // The §10.5 table: amount pre-formatted per locale by the API; the symbol leads only in English.
  const cases: Array<[Locale, string, string]> = [
    ['en', '5,000', 'GH₵5,000'],
    ['es', '5.000', '5.000 GH₵'],
    ['fr', '5 000', '5 000 GH₵'],
    ['de', '5.000', '5.000 GH₵'],
  ];

  for (const [locale, amount, expected] of cases) {
    it(`renders ${expected} for ${locale}`, () => {
      localeService.use(locale);
      const pipe = TestBed.inject(PlanPricePipe);
      expect(pipe.transform({ priceAmount: amount, priceCurrency: 'GHS' })).toBe(expected);
    });
  }
});
