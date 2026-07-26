import { Injectable, computed, signal } from '@angular/core';
import {
  CareService,
  Faq,
  Plan,
  Section,
  SiteContent,
  SiteSettings,
  Testimonial,
} from '../../core/api/site-content.model';
import { AdminContentType } from '../core/admin-api';
import { Locale } from '../../core/i18n/locales';

type Localized = Record<string, string> | undefined | null;

/**
 * A SiteContentStore stand-in for the editor's live preview (E-8): same public surface, fed from
 * the draft document being edited instead of the API — so the preview pane renders the ACTUAL
 * public components, not an approximation, with locale resolution matching the backend's
 * (requested locale, else English).
 */
@Injectable()
export class PreviewContentStore {
  private readonly state = signal<SiteContent | undefined>(undefined);

  readonly content = computed(() => this.state());
  readonly settings = computed(() => this.state()?.siteSettings);
  readonly sections = computed(() => this.state()?.sections ?? {});
  readonly services = computed(() => this.state()?.services ?? []);
  readonly plans = computed(() => this.state()?.plans ?? []);
  readonly stories = computed(() => this.state()?.testimonials ?? []);
  readonly faqs = computed(() => this.state()?.faqs ?? []);
  readonly loading = computed(() => false);
  readonly failed = computed(() => false);

  section(key: string) {
    return computed(() => this.sections()[key]);
  }

  reload(): void {
    /* preview data is pushed, not fetched */
  }

  setFrom(type: AdminContentType, document: Record<string, unknown>, locale: Locale): void {
    const resolve = (value: unknown): string => {
      const localized = value as Localized;
      if (!localized || typeof localized !== 'object') {
        return typeof value === 'string' ? value : '';
      }
      return localized[locale]?.trim() ? localized[locale] : (localized['en'] ?? '');
    };

    const base: SiteContent = {
      locale,
      generatedAt: new Date().toISOString(),
      siteSettings: emptySettings(),
      sections: {},
      services: [],
      plans: [],
      testimonials: [],
      faqs: [],
    };

    switch (type) {
      case 'services': {
        const service: CareService = {
          id: 'preview',
          slug: String(document['slug'] ?? ''),
          name: resolve(document['name']),
          blurb: resolve(document['blurb']),
          points: ((document['points'] as unknown[]) ?? []).map(resolve),
          availableOn: resolve(document['availableOn']),
          image: null,
          displayOrder: 1,
        };
        base.services = [service];
        break;
      }
      case 'plans': {
        const price = document['price'] as Record<string, unknown> | undefined;
        const plan: Plan = {
          id: 'preview',
          code: String(document['code'] ?? ''),
          name: resolve(document['name']),
          forWho: resolve(document['forWho']),
          priceAmount: Number(price?.['amount'] ?? 0).toLocaleString(locale),
          priceCurrency: 'GHS',
          priceNote: resolve(document['priceNote']),
          featured: Boolean(document['featured']),
          features: ((document['features'] as Record<string, unknown>[]) ?? []).map((feature) => ({
            label: resolve(feature['label']),
            included: Boolean(feature['included']),
            emphasised: Boolean(feature['emphasised']),
          })),
          comparison: {
            visitsPerWeek: '',
            medicalSupport: '',
            auxiliary: '',
            telemetry: '',
            reporting: '',
            careManager: '',
          },
          displayOrder: 1,
        };
        base.plans = [plan];
        break;
      }
      case 'testimonials': {
        const testimonial: Testimonial = {
          id: 'preview',
          quote: resolve(document['quote']),
          personName: String(document['personName'] ?? ''),
          personRole: resolve(document['personRole']),
          planLabel: resolve(document['planLabel']),
          rating: Number(document['rating'] ?? 5),
          portrait: null,
          displayOrder: 1,
        };
        base.testimonials = [testimonial];
        break;
      }
      case 'faqs': {
        const faq: Faq = {
          id: 'preview',
          question: resolve(document['question']),
          answer: resolve(document['answer']),
          displayOrder: 1,
        };
        base.faqs = [faq];
        break;
      }
      case 'sections': {
        const section: Section = {
          eyebrow: resolve(document['eyebrow']),
          heading: resolve(document['heading']),
          subheading: resolve(document['subheading']),
          body: resolve(document['body']),
          items: ((document['items'] as Record<string, unknown>[]) ?? []).map((item) => ({
            key: String(item['key'] ?? ''),
            icon: String(item['icon'] ?? ''),
            title: resolve(item['title']),
            body: resolve(item['body']),
          })),
          image: null,
        };
        base.sections = { [String(document['key'] ?? 'hero').toLowerCase()]: section };
        break;
      }
      case 'settings': {
        const address = (document['address'] as Record<string, unknown>) ?? {};
        const settings: SiteSettings = {
          organisationName: String(document['organisationName'] ?? ''),
          tagline: resolve(document['tagline']),
          phones: (document['phones'] as string[]) ?? [],
          whatsapp: String(document['whatsapp'] ?? ''),
          email: String(document['email'] ?? ''),
          address: {
            street: String(address['street'] ?? ''),
            district: String(address['district'] ?? ''),
            city: String(address['city'] ?? ''),
            country: String(address['country'] ?? ''),
          },
          coordinationHours: resolve(document['coordinationHours']),
          onCallHours: resolve(document['onCallHours']),
        };
        base.siteSettings = settings;
        break;
      }
    }
    this.state.set(base);
  }
}

function emptySettings(): SiteSettings {
  return {
    organisationName: '',
    tagline: '',
    phones: [],
    whatsapp: '',
    email: '',
    address: { street: '', district: '', city: '', country: '' },
    coordinationHours: '',
    onCallHours: '',
  };
}
