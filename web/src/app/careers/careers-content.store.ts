import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ContentApi } from '../core/api/content.api';
import { LocaleService } from '../core/i18n/locale.service';

/**
 * The handoff contract moved to `core/api/professional-handoff.ts` in task 147, so the home page's
 * professional call-to-action can build the same link without importing anything from this
 * lazily-loaded chunk. Re-exported here because roughly a dozen call sites, tests and doc references
 * name it at this path, and a silent move would be a worse trade than one line of indirection.
 */
export { PROFESSIONAL_PORTAL, handoffUrl, registerUrlFor } from '../core/api/professional-handoff';

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
