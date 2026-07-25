import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #2 — phone/email/hours strip fed by siteSettings. */
@Component({
  selector: 'abc-top-contact-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (store.settings(); as settings) {
      <div class="bg-brand-navy text-white text-sm">
        <div class="max-w-6xl mx-auto px-4 py-1.5 flex flex-wrap items-center gap-x-6 gap-y-1">
          <a class="hover:underline" href="tel:{{ settings.phones[0] }}">{{ settings.phones[0] }}</a>
          <a class="hover:underline hidden sm:inline" href="mailto:{{ settings.email }}">{{ settings.email }}</a>
          <span class="ml-auto hidden md:inline text-white/80">{{ 'topbar.hoursLabel' | transloco }}</span>
        </div>
      </div>
    }
  `,
})
export class TopContactStrip {
  protected readonly store = inject(SiteContentStore);
}
