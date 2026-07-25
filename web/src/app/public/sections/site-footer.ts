import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';

/** Spec §6 #18 — footer columns from siteSettings + the services list (never hardcoded). */
@Component({
  selector: 'abc-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <footer class="bg-brand-navy text-white/80 text-sm">
      <div class="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div class="prose-reset">
          <p class="font-serif text-lg text-white">Abofonsa <span class="text-brand-gold">BridgeCare</span></p>
          @if (store.settings(); as settings) {
            <p class="mt-3">{{ settings.tagline }}</p>
          }
        </div>
        <nav [attr.aria-label]="'footer.servicesHeading' | transloco" class="prose-reset">
          <p class="font-semibold text-white">{{ 'footer.servicesHeading' | transloco }}</p>
          <ul class="mt-3 grid gap-2 list-none m-0 p-0">
            @for (service of store.services(); track service.id) {
              <li><a class="hover:underline" href="#services">{{ service.name }}</a></li>
            }
          </ul>
        </nav>
        <nav [attr.aria-label]="'footer.companyHeading' | transloco" class="prose-reset">
          <p class="font-semibold text-white">{{ 'footer.companyHeading' | transloco }}</p>
          <ul class="mt-3 grid gap-2 list-none m-0 p-0">
            <li><a class="hover:underline" href="#approach">{{ 'nav.approach' | transloco }}</a></li>
            <li><a class="hover:underline" href="#pricing">{{ 'nav.pricing' | transloco }}</a></li>
            <li><a class="hover:underline" href="#faq">{{ 'nav.faq' | transloco }}</a></li>
          </ul>
        </nav>
        <div class="prose-reset">
          <p class="font-semibold text-white">{{ 'footer.contactHeading' | transloco }}</p>
          @if (store.settings(); as settings) {
            <ul class="mt-3 grid gap-2 list-none m-0 p-0">
              @for (phone of settings.phones; track phone) {
                <li><a class="hover:underline" href="tel:{{ phone }}">{{ phone }}</a></li>
              }
              <li><a class="hover:underline" href="mailto:{{ settings.email }}">{{ settings.email }}</a></li>
              <li class="leading-relaxed">
                {{ settings.address.street }}<br />{{ settings.address.district }}<br />{{ settings.address.city }},
                {{ settings.address.country }}
              </li>
            </ul>
          }
        </div>
      </div>
      <div class="border-t border-white/15">
        <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-2 justify-between">
          <span>{{ 'footer.rights' | transloco: { year: year } }}</span>
          <span>{{ 'footer.productBy' | transloco: { company: 'jojoaddison' } }}</span>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly store = inject(SiteContentStore);
  protected readonly year = new Date().getFullYear();
}
