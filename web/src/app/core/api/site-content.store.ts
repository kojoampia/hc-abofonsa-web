import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ContentApi } from './content.api';
import { LocaleService } from '../i18n/locale.service';

/**
 * The one shared content store (spec §5.5): every section component reads from here, so a locale
 * switch re-fetches once and updates the whole page from a single request (AD-3 — the aggregate
 * endpoint exists precisely so there is no per-section waterfall).
 */
@Injectable({ providedIn: 'root' })
export class SiteContentStore {
  private readonly api = inject(ContentApi);
  private readonly locale = inject(LocaleService);

  private readonly resource = rxResource({
    params: () => ({ locale: this.locale.current() }),
    stream: ({ params }) => this.api.siteContent(params.locale),
  });

  readonly content = computed(() => this.resource.value());
  readonly settings = computed(() => this.content()?.siteSettings);
  readonly sections = computed(() => this.content()?.sections ?? {});
  readonly services = computed(() => this.content()?.services ?? []);
  readonly plans = computed(() => this.content()?.plans ?? []);
  readonly stories = computed(() => this.content()?.testimonials ?? []);
  readonly faqs = computed(() => this.content()?.faqs ?? []);
  readonly loading = computed(() => this.resource.isLoading());
  readonly failed = computed(() => this.resource.status() === 'error');

  section(key: string) {
    return computed(() => this.sections()[key]);
  }

  reload(): void {
    this.resource.reload();
  }
}
