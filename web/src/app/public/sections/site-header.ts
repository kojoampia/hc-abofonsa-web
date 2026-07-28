import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';
import { LanguageSwitcher } from './language-switcher';

const SECTION_IDS = ['services', 'how', 'approach', 'pricing', 'testimonials', 'faq', 'contact'];

/** Spec §6 #3 — sticky nav with scroll-spy over the anchor sections; mat-menu mobile drawer. */
@Component({
  selector: 'abc-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuModule, MatButtonModule, TranslocoPipe, LanguageSwitcher, RouterLink],
  template: `
    <header class="sticky top-0 z-40 bg-brand-surface/95 backdrop-blur border-b border-brand-line">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <a href="#top" class="font-serif text-xl text-brand-navy font-semibold" [attr.aria-label]="'a11y.logoAlt' | transloco">
          Abofonsa <span class="text-brand-gold-ink">BridgeCare</span>
        </a>

        <nav class="hidden lg:flex items-center gap-5 text-sm ml-auto" [attr.aria-label]="'a11y.mainNav' | transloco">
          @for (item of navItems; track item.id) {
            <a
              href="#{{ item.id }}"
              class="hover:text-brand-navy py-3"
              [class.text-brand-navy]="active() === item.id"
              [class.font-semibold]="active() === item.id"
              [attr.aria-current]="active() === item.id ? 'true' : null"
            >
              {{ item.key | transloco }}
            </a>
          }
          <!-- Careers is a different page and a different audience, so it is a routerLink among
               anchor links, and deliberately the quietest item in the bar. -->
          <a [routerLink]="careersLink()" class="hover:text-brand-navy py-3" data-testid="nav-careers">
            {{ 'careers.nav' | transloco }}
          </a>
          <a href="#contact" class="bg-brand-navy text-white rounded px-4 py-2">{{ 'nav.cta' | transloco }}</a>
          <abc-language-switcher />
        </nav>

        <div class="lg:hidden ml-auto flex items-center gap-2">
          <abc-language-switcher />
          <button
            mat-icon-button
            [matMenuTriggerFor]="mobileMenu"
            [attr.aria-label]="'a11y.openMenu' | transloco"
            data-testid="mobile-menu-button"
          >
            ☰
          </button>
          <mat-menu #mobileMenu="matMenu">
            @for (item of navItems; track item.id) {
              <a mat-menu-item href="#{{ item.id }}">{{ item.key | transloco }}</a>
            }
            <a mat-menu-item href="#contact">{{ 'nav.cta' | transloco }}</a>
          </mat-menu>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  private readonly locale = inject(LocaleService);

  protected readonly navItems = [
    { id: 'services', key: 'nav.services' },
    { id: 'how', key: 'nav.how' },
    { id: 'approach', key: 'nav.approach' },
    { id: 'pricing', key: 'nav.pricing' },
    { id: 'testimonials', key: 'nav.testimonials' },
    { id: 'faq', key: 'nav.faq' },
  ];

  /** Careers lives under the locale prefix like every other route, so the link has to be built
   * rather than hard-coded — `/careers` in English, `/fr/careers` in French. */
  protected readonly careersLink = computed(() => `${this.locale.pathPrefix()}/careers`);

  /** The section currently in view — drives aria-current and the highlight (scroll-spy). */
  readonly active = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver !== 'function') {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.active.set(entry.target.id);
            }
          }
        },
        { rootMargin: '-40% 0px -55% 0px' },
      );
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          observer.observe(el);
        }
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
