import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LocaleService } from '../../core/i18n/locale.service';
import { LOCALE_NAMES, Locale, SUPPORTED_LOCALES } from '../../core/i18n/locales';

/**
 * Spec §6 #4 — the language chooser: one button per locale, showing its two-letter code.
 *
 * Two-letter codes rather than flags, deliberately. A flag is a country, not a language: English,
 * Spanish, French and German are each spoken across many countries, so any single flag misstates
 * whose language it is, and some of those choices are actively contentious. The code needs no
 * image, and each button carries the language's own endonym as its accessible name, so a screen
 * reader announces "Español" rather than spelling out "E S".
 *
 * Switching navigates to the locale-prefixed path so the URL always reflects the language (§10.4).
 */
@Component({
  selector: 'abc-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  styles: `
    .lang-button {
      border: 1px solid var(--color-brand-line, #e2e5ea);
      border-radius: 6px;
      /* 24px minimum touch target (WCAG 2.2 SC 2.5.8) - compact, but never sub-target. */
      min-width: 2.25rem;
      min-height: 1.75rem;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.8125rem;
      line-height: 1;
      cursor: pointer;
    }
    .lang-button:hover:not([aria-current='true']) {
      border-color: var(--color-brand-navy, #0d3058);
    }
    .lang-button[aria-current='true'] {
      background: var(--color-brand-navy, #0d3058);
      border-color: var(--color-brand-navy, #0d3058);
      color: #fff;
      font-weight: 600;
    }
  `,
  template: `
    <div
      class="flex items-center gap-1"
      role="group"
      [attr.aria-label]="'lang.switchLanguage' | transloco"
      data-testid="language-switcher"
    >
      @for (code of locales; track code) {
        <button
          type="button"
          class="lang-button uppercase tracking-wide px-2"
          [lang]="code"
          [attr.aria-current]="locale.current() === code ? 'true' : null"
          [attr.aria-label]="names[code]"
          [attr.data-testid]="'lang-' + code"
          (click)="switchTo(code)"
        >
          {{ code }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcher {
  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly locales = SUPPORTED_LOCALES;
  protected readonly names = LOCALE_NAMES;

  /**
   * Records the choice, then navigates.
   *
   * The `use()` call is load-bearing, and its absence was the bug. English is the one locale with
   * no path prefix, so choosing it navigates to `/` — a URL indistinguishable from a plain first
   * visit. `PublicShell` resolves `/` through the §10.4 order (cookie, then Accept-Language, then
   * English), and the cookie still held whichever language the visitor was switching *away* from.
   * Every other language worked, because its prefix wins outright; English alone bounced silently
   * back to the previous one.
   *
   * Writing the preference before navigating makes the explicit choice the remembered one — which
   * is what a language cookie is for — and keeps a later reload of `/` consistent with it.
   * Transloco is set here too, so the switch does not depend on the shell being rebuilt.
   */
  switchTo(code: Locale): void {
    this.locale.use(code);
    this.transloco.setActiveLang(code);
    this.router.navigateByUrl(this.locale.pathPrefix(code) || '/');
  }
}
