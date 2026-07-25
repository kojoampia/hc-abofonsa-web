import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { TranslocoHttpLoader } from './transloco-http.loader';

describe('TranslocoHttpLoader (spec §10.3)', () => {
  let loader: TranslocoHttpLoader;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    loader = TestBed.inject(TranslocoHttpLoader);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('merges CMS overrides over the shipped defaults - override wins', async () => {
    const result = firstValueFrom(loader.getTranslation('en'));
    http.expectOne('/i18n/en.json').flush({ nav: { pricing: 'Plans and pricing', home: 'Home' } });
    http.expectOne('/api/v1/i18n/en.json').flush({ 'nav.pricing': 'Fees & plans' });

    await expect(result).resolves.toEqual({
      'nav.pricing': 'Fees & plans',
      'nav.home': 'Home',
    });
  });

  it('still resolves from the shipped bundle when the API is unreachable - the site renders without the API', async () => {
    const result = firstValueFrom(loader.getTranslation('fr'));
    http.expectOne('/i18n/fr.json').flush({ nav: { pricing: 'Forfaits et tarifs' } });
    http.expectOne('/api/v1/i18n/fr.json').error(new ProgressEvent('network down'));

    await expect(result).resolves.toEqual({ 'nav.pricing': 'Forfaits et tarifs' });
  });
});
