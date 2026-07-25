import { TestBed } from '@angular/core/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { Subject, of } from 'rxjs';
import { SiteContentStore } from './site-content.store';
import { ContentApi } from './content.api';
import { LocaleService } from '../i18n/locale.service';
import { SiteContent } from './site-content.model';

function stubContent(locale: string): SiteContent {
  return {
    locale,
    generatedAt: new Date().toISOString(),
    siteSettings: {
      organisationName: 'Abofonsa BridgeCare',
      tagline: `tagline-${locale}`,
      phones: ['+233 302 717 577'],
      whatsapp: '',
      email: 'info@abofonsa.com',
      address: { street: '', district: '', city: 'Accra', country: 'Ghana' },
      coordinationHours: '',
      onCallHours: '',
    },
    sections: {},
    services: [],
    plans: [],
    testimonials: [],
    faqs: [],
  };
}

describe('SiteContentStore (spec §5.5)', () => {
  it('fetches once per locale and re-fetches exactly once when the locale changes', async () => {
    const calls: string[] = [];
    const apiStub = {
      siteContent: (locale: string) => {
        calls.push(locale);
        return of(stubContent(locale));
      },
    };
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ContentApi, useValue: apiStub }],
    });

    const store = TestBed.inject(SiteContentStore);
    const localeService = TestBed.inject(LocaleService);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(calls).toEqual(['en']);
    expect(store.content()?.siteSettings.tagline).toBe('tagline-en');

    localeService.use('es');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(calls).toEqual(['en', 'es']);
    expect(store.content()?.siteSettings.tagline).toBe('tagline-es');
  });

  it('exposes loading and error state for the page-level empty states', async () => {
    const pending = new Subject<SiteContent>();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContentApi, useValue: { siteContent: () => pending.asObservable() } },
      ],
    });
    const store = TestBed.inject(SiteContentStore);
    // whenStable() would wait for the resource to finish - tick effects manually instead while
    // the request is deliberately left hanging.
    TestBed.tick();
    expect(store.loading()).toBe(true);
    pending.error(new Error('boom'));
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(store.failed()).toBe(true);
  });
});
