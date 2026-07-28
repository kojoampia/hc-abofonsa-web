import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ContentApi } from '../core/api/content.api';
import { LocaleService } from '../core/i18n/locale.service';
import { CareerTrack } from '../core/api/site-content.model';

/**
 * Where a candidate is handed over to the onboarding app.
 *
 * A compiled-in constant rather than CMS content, deliberately: this is the careers page's only
 * conversion, and a mistyped value in a content field would break it silently for everyone with no
 * build or test failing. It changes roughly never, and when it does it should go through review.
 * The one genuinely switchable part — whether the invitation path is offered — *is* CMS-controlled,
 * through `siteSettings.professionalInvitationUrl`.
 */
export const PROFESSIONAL_PORTAL = 'https://professional.abofonsa.com';

/**
 * Builds the handoff URL (careers-plan.md §5).
 *
 * The three parameters are the entire contract with `hc-professional` — there is no shared cookie
 * or session across the domains, so anything that side needs has to be in the link:
 *
 * - `track` so the role chosen here is not asked again,
 * - `locale` so the candidate continues in the language they were reading,
 * - `src` so the funnel can be joined at the far end; without it the attribution in §8 is
 *   decorative and nobody can say whether this page works.
 */
export function handoffUrl(base: string, track: CareerTrack | null, locale: string): string {
  const url = new URL(base);
  if (track) {
    url.searchParams.set('track', track.authorityRole);
  }
  url.searchParams.set('locale', locale);
  url.searchParams.set('src', 'web-careers');
  return url.toString();
}

/**
 * The careers page's content store.
 *
 * Separate from `SiteContentStore` because the payloads are separate, and root-provided but only
 * ever injected from the lazily-loaded careers route — so it lands in that chunk and costs a home
 * page visitor nothing.
 */
@Injectable({ providedIn: 'root' })
export class CareersContentStore {
  private readonly api = inject(ContentApi);
  private readonly locale = inject(LocaleService);

  private readonly resource = rxResource({
    params: () => ({ locale: this.locale.current() }),
    stream: ({ params }) => this.api.careersContent(params.locale),
  });

  readonly content = computed(() => this.resource.value());
  readonly sections = computed(() => this.content()?.sections ?? {});
  readonly tracks = computed(() => this.content()?.tracks ?? []);
  readonly faqs = computed(() => this.content()?.faqs ?? []);
  readonly loading = computed(() => this.resource.isLoading());
  readonly failed = computed(() => this.resource.status() === 'error');

  /**
   * The `lang` to put on the CMS-driven region, or `null` when it matches the page and no attribute
   * is needed.
   *
   * Careers copy is seeded English-only (careers-plan.md D-5), so `/es/careers` renders English
   * prose inside `<html lang="es">`. Left unmarked that is a WCAG 2.2 AA failure under 3.1.2
   * Language of Parts: a screen reader applies Spanish pronunciation to English words and the
   * output is not intelligible. No automated checker catches it — axe-core does not read prose — so
   * the server reports the language it actually served and this turns it into an attribute.
   *
   * Deliberately not a hardcoded `'en'`: the day an editor translates the page this returns null on
   * its own and the attribute disappears, with nothing to remember to undo.
   */
  readonly contentLang = computed(() => {
    const content = this.content();
    if (!content || content.contentLanguage === this.locale.current()) {
      return null;
    }
    return content.contentLanguage;
  });

  section(key: string) {
    return computed(() => this.sections()[key]);
  }

  reload(): void {
    this.resource.reload();
  }
}
