import { Provider } from '@angular/core';
import { of } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ContentApi } from '../core/api/content.api';
import { Plan, Section, SiteContent } from '../core/api/site-content.model';
import { flatten } from '../core/i18n/transloco-http.loader';
import en from '../../../public/i18n/en.json';

function section(partial: Partial<Section>): Section {
  return { eyebrow: '', heading: '', subheading: '', body: '', items: [], image: null, ...partial };
}

export function makePlan(partial: Partial<Plan>): Plan {
  return {
    id: 'plan-' + (partial.code ?? 'X'),
    code: 'PEAR',
    name: 'PEAR Plan',
    forWho: 'A dependable weekday routine.',
    priceAmount: '3,000',
    priceCurrency: 'GHS',
    priceNote: 'Minimum three-month term',
    featured: false,
    features: [
      { label: '5 weekly visits', included: true, emphasised: true },
      { label: 'Doctor review included', included: false, emphasised: false },
    ],
    comparison: {
      visitsPerWeek: '5 weekly visits',
      medicalSupport: 'Nursing support',
      auxiliary: 'Cleaning, washing, grocery',
      telemetry: 'Included',
      reporting: 'After every visit',
      careManager: 'Shared',
    },
    displayOrder: 1,
    ...partial,
  };
}

export function makeSiteContent(): SiteContent {
  return {
    locale: 'en',
    generatedAt: new Date().toISOString(),
    siteSettings: {
      organisationName: 'Abofonsa BridgeCare',
      tagline: 'Providing peace of mind across borders',
      phones: ['+233 302 717 577', '+233 502 588 736'],
      whatsapp: '+233 242 286 304',
      email: 'info@abofonsa.com',
      address: {
        street: 'Ankobra River Street #5',
        district: 'Teshie Nungua Estates',
        city: 'Accra',
        country: 'Ghana',
      },
      coordinationHours: 'Monday–Saturday, 07:00–19:00 GMT',
      onCallHours: '24 hours, every day',
    },
    sections: {
      hero: section({
        eyebrow: 'Providing peace of mind across borders',
        heading: 'Hospital-grade care, delivered to the door.',
        subheading: 'Abofonsa means "Angelic Hands".',
        body: 'Abofonsa BridgeCare Health Connect brings scheduled nursing into the home.',
        items: [
          { key: 'stat-fulfilment', icon: 'shield', title: '99%', body: 'Shift fulfilment' },
          { key: 'stat-monitored', icon: 'clock', title: '24/7', body: 'Monitored care' },
          { key: 'badge-vetted', icon: 'badge', title: 'Vetted professionals', body: '' },
        ],
      }),
      assurance: section({
        items: [
          { key: 'a1', icon: 'shield', title: 'Vetted professionals', body: 'Background-checked staff' },
          { key: 'a2', icon: 'check', title: '99% shift fulfilment', body: 'Cover is arranged in time' },
        ],
      }),
      process: section({
        eyebrow: 'The process',
        heading: 'Getting started takes about a week',
        items: [
          { key: 'p1', icon: 'phone', title: 'Consultation', body: 'We talk through the situation.' },
          { key: 'p2', icon: 'clipboard', title: 'Clinical assessment', body: 'A registered nurse visits.' },
          { key: 'p3', icon: 'file', title: 'Your care plan', body: 'A written daily service plan.' },
          { key: 'p4', icon: 'heart', title: 'Care begins', body: 'Visits start on schedule.' },
        ],
      }),
      approach: section({
        eyebrow: 'Our approach',
        heading: 'Care that is coordinated, not improvised',
        items: [{ key: 'f1', icon: 'calendar', title: 'Scheduling that holds', body: 'Cover is arranged.' }],
      }),
      stats: section({
        items: [
          { key: 's1', icon: 'check', title: '99%', body: 'Shift fulfilment rate' },
          { key: 's2', icon: 'activity', title: '24/7', body: 'Telemetry monitoring' },
        ],
      }),
      angel: section({
        eyebrow: 'The Angel network',
        heading: 'Someone is always accountable',
        items: [{ key: 'g1', icon: 'file', title: 'A report after every visit', body: 'Countersigned notes.' }],
      }),
      cta: section({
        heading: "Discuss your family's needs with a nurse",
        body: 'A consultation is free and carries no obligation.',
      }),
    },
    services: Array.from({ length: 6 }, (_, i) => ({
      id: `svc-${i + 1}`,
      slug: `service-${i + 1}`,
      name: `Service ${i + 1}`,
      blurb: `Blurb for service ${i + 1}`,
      points: ['Point A', 'Point B'],
      availableOn: 'All plans',
      image: null,
      displayOrder: i + 1,
    })),
    plans: [
      makePlan({ code: 'PEAR', name: 'PEAR Plan', priceAmount: '3,000', displayOrder: 1 }),
      makePlan({ code: 'PAWPAW', name: 'PAWPAW Plan', priceAmount: '5,000', featured: true, displayOrder: 2 }),
      makePlan({ code: 'MELON', name: 'MELON Plan', priceAmount: '8,000', displayOrder: 3 }),
    ],
    testimonials: [
      {
        id: 't1',
        quote: 'The nurse knows her routine better than I do.',
        personName: 'Adwoa Boateng',
        personRole: 'Daughter · Subscriber since 2025',
        planLabel: 'PAWPAW Plan',
        rating: 5,
        portrait: null,
        displayOrder: 1,
      },
      {
        id: 't2',
        quote: 'Six weeks later I am walking to church again.',
        personName: 'Emmanuel Ofori',
        personRole: 'Patient · Dansoman, Accra',
        planLabel: 'MELON Plan',
        rating: 5,
        portrait: null,
        displayOrder: 2,
      },
    ],
    faqs: [
      { id: 'f1', question: 'Which areas do you currently cover?', answer: 'Greater Accra.', displayOrder: 1 },
      { id: 'f2', question: 'Are your nurses qualified?', answer: 'Yes, licensed and vetted.', displayOrder: 2 },
    ],
  };
}

/** Providers + imports for a section component test: stubbed API feeding the real store, plus
 * Transloco preloaded with the real shipped English bundle. */
export function contentApiStub(content: SiteContent = makeSiteContent()): Provider {
  return { provide: ContentApi, useValue: { siteContent: () => of(content), submitEnquiry: () => of({}) } };
}

export function translocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: { en: flatten(en as never) },
    translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
    preloadLangs: true,
  });
}
