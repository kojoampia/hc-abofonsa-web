import { DOCUMENT, Injectable, PLATFORM_ID, REQUEST, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { SiteContent } from '../api/site-content.model';
import { Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../i18n/locales';
import { SITE_INDEXABLE } from './indexable';

/**
 * Last-resort origin, used only if neither the request nor the browser can supply one. A canonical
 * URL is a claim about where the page really lives, so this must never be a guess in practice —
 * see {@link SeoService.origin}.
 */
const FALLBACK_ORIGIN = 'https://web.abofonsa.com';

/**
 * Per-locale SEO head management (spec §6.3): title, description, canonical, hreflang alternates
 * for all four locales plus x-default, Open Graph/Twitter tags, and JSON-LD (MedicalBusiness,
 * Service per care service, Offer per plan, FAQPage). All values come from the content store so
 * they stay consistent with the visible page.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly indexable = inject(SITE_INDEXABLE);

  /**
   * The origin this page is actually being served from, taken from the request on the server and
   * from the browser's own location on the client.
   *
   * It used to be a hard-coded constant, which is a quiet trap: the moment the site is served from
   * anywhere other than that constant — a review deployment, a staging host, a renamed domain —
   * every canonical and hreflang link points somewhere else. Search engines treat that as an
   * instruction to index the *other* origin, so the deployment you are looking at disappears from
   * results in favour of one that may not exist. Deriving it means it cannot be wrong, and no
   * environment variable has to be remembered.
   */
  private origin(): string {
    if (this.isBrowser) {
      return this.document.location.origin;
    }
    const url = this.request?.url;
    return url ? new URL(url).origin : FALLBACK_ORIGIN;
  }

  apply(locale: Locale, content: SiteContent): void {
    const settings = content.siteSettings;
    const pageTitle = `${settings.organisationName} — ${settings.tagline}`;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: settings.tagline });

    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: settings.tagline });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: this.urlFor(locale) });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });

    this.setRobots();
    this.setCanonicalAndAlternates(locale);
    this.setJsonLd(content);
  }

  /**
   * Emits `noindex` unless this deployment has explicitly opted in. Written on every page so a
   * review or staging host cannot leak a single indexable route, and paired with the `robots.txt`
   * the SSR server serves — a meta tag alone is ignored by crawlers that never fetch the page, and
   * robots.txt alone does not prevent a URL appearing in results if it is linked from elsewhere.
   */
  private setRobots(): void {
    this.meta.updateTag({
      name: 'robots',
      content: this.indexable ? 'index,follow' : 'noindex,nofollow',
    });
  }

  private urlFor(locale: Locale): string {
    const origin = this.origin();
    return locale === DEFAULT_LOCALE ? `${origin}/` : `${origin}/${locale}`;
  }

  private setCanonicalAndAlternates(locale: Locale): void {
    const head = this.document.head;
    head.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    const canonical = this.document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', this.urlFor(locale));
    head.appendChild(canonical);

    for (const alt of SUPPORTED_LOCALES) {
      head.appendChild(this.alternate(alt, this.urlFor(alt)));
    }
    head.appendChild(this.alternate('x-default', this.urlFor(DEFAULT_LOCALE)));
  }

  private alternate(hreflang: string, href: string): HTMLLinkElement {
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', hreflang);
    link.setAttribute('href', href);
    return link;
  }

  private setJsonLd(content: SiteContent): void {
    this.document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
    const settings = content.siteSettings;

    const graphs: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        name: settings.organisationName,
        telephone: settings.phones[0],
        email: settings.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${settings.address.street}, ${settings.address.district}`,
          addressLocality: settings.address.city,
          addressCountry: settings.address.country,
        },
        areaServed: 'Greater Accra',
        openingHours: settings.coordinationHours,
      },
      ...content.services.map((service) => ({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.blurb,
        provider: { '@type': 'MedicalBusiness', name: settings.organisationName },
      })),
      ...content.plans.map((plan) => ({
        '@context': 'https://schema.org',
        '@type': 'Offer',
        name: plan.name,
        description: plan.forWho,
        price: plan.priceAmount.replace(/[^0-9.,]/g, ''),
        priceCurrency: 'GHS',
      })),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: content.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ];

    for (const graph of graphs) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(graph);
      this.document.head.appendChild(script);
    }
  }
}
