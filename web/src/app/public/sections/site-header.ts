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
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <a
          href="#top"
          class="flex items-center gap-2.5 font-serif text-xl text-brand-navy font-semibold shrink-0"
          [attr.aria-label]="'a11y.logoAlt' | transloco"
        >
          <!--
            alt="" on purpose. The badge already contains the words "Abofonsa BridgeCare", the link
            renders them again as text, and the link carries an aria-label — so giving the image a
            name would make a screen reader say the same thing three times for one control. It is
            decorative in the accessibility sense precisely because the information is already there.
            width/height are set so the header does not reflow while it loads (CLS).
          -->
          <img
            src="logo-abofonsa-bridgecare.png"
            alt=""
            aria-hidden="true"
            width="40"
            height="40"
            class="h-10 w-10 shrink-0"
          />
          <!--
            Hidden below 640px, where the badge stands in for it. The header had no slack at 390px:
            adding the logo pushed the layout to 484px, which put the language chooser's last two
            codes and the menu button off-screen and gave the page a horizontal scrollbar. The badge
            is the more compressible of the two — it carries the brand at a glance, whereas the
            chooser and the menu are controls people need to reach. The link keeps its aria-label, so
            the accessible name is "Abofonsa BridgeCare logo" at every width.
          -->
          <span class="hidden sm:inline">Abofonsa <span class="text-brand-gold-ink">BridgeCare</span></span>
        </a>

        <!--
          Shown from 1240px, not from lg (1024), and the gaps are tighter than they were.

          The bar did not fit at lg and never had: measured against the pre-change markup it needed
          1066px in English and 1152px in German inside a 1024px viewport, so it overflowed in every
          language at the width it first appeared, and in French it overflowed its own 1152px
          container even on a 1440px screen. Nothing caught it — the horizontal-overflow guard in
          branding.spec.ts runs at 390px, where this bar is hidden, and the visual baselines are
          taken at 390, 834 and 1440, none of which is a width where the bar is both visible and
          short of room.

          Making the careers link a prominent button (task 147) added 42–63px to a bar that was
          already over, which is how it was found. The fix is the breakpoint and the spacing rather
          than a shorter label: below 1240px the drawer takes over, and the drawer now carries every
          item the bar does.
        -->
        <nav
          class="hidden min-[1240px]:flex items-center gap-4 text-sm ml-auto"
          [attr.aria-label]="'a11y.mainNav' | transloco"
        >
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
               anchor links — and now a deliberately loud one. It was the quietest item in the bar
               under careers-plan.md CR-1; the owner asked for prominence, so it is outlined in gold
               and labelled for the audience it wants ("For professionals" says who it is for, where
               "Careers" makes a visitor work that out). Gold ink, not a gold fill: white or navy on
               a gold fill is 2.74:1 and fails AA, and this sits on cream. -->
          <a
            [routerLink]="careersLink()"
            class="border border-brand-gold text-brand-gold-ink rounded px-3 py-2 font-medium hover:bg-brand-cream"
            data-testid="nav-careers"
          >
            {{ 'careers.forProfessionals' | transloco }}
          </a>
          <!-- Two words, and nowrap. The offer itself belongs in the band, not here: spelled out in
               the bar it became a 98×96px block of wrapped text inside a 64px-tall header, because
               this bar has been one item away from full since long before it gained two. The drawer
               below has room and says the whole thing.
               It points at #offer rather than straight at the portal because the band is where the
               terms are, and a family should pass them on the way to registering. -->
          <a
            href="#offer"
            class="bg-brand-navy text-white rounded px-4 py-2 font-medium whitespace-nowrap"
            data-testid="nav-signup"
          >
            {{ 'patient.signUp' | transloco }}
          </a>
          <!-- Two calls to action in one bar is one too many, and French proved it: the bar needs
               1251px at a 1240px breakpoint with both. Rather than drop this, it appears only where
               there is room for it. Nothing is lost below that width — the sign-up button leads to
               the offer band, which carries this same link, and the drawer and footer both keep it. -->
          <a href="#contact" class="hidden min-[1400px]:inline-flex py-3 hover:text-brand-navy">
            {{ 'nav.cta' | transloco }}
          </a>
          <abc-language-switcher />
        </nav>

        <div class="min-[1240px]:hidden ml-auto flex items-center gap-2">
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
            <a mat-menu-item href="#offer" data-testid="mobile-nav-signup">{{ 'patient.signUpFree' | transloco }}</a>
            <a mat-menu-item href="#contact">{{ 'nav.cta' | transloco }}</a>
            <!-- Absent entirely until now: the desktop bar had a careers link and this drawer did
                 not, so below 1024px the only route to the page was the footer. -->
            <a mat-menu-item [routerLink]="careersLink()" data-testid="mobile-nav-careers">
              {{ 'careers.forProfessionals' | transloco }}
            </a>
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
