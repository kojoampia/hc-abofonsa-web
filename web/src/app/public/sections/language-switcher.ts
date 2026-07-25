import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '../../core/i18n/locale.service';
import { LOCALE_NAMES, Locale, SUPPORTED_LOCALES } from '../../core/i18n/locales';

/**
 * Spec §6 #4 — a mat-select whose options carry their own lang attribute (§6.2); switching
 * navigates to the locale-prefixed path so the URL always reflects the language (§10.4).
 */
@Component({
  selector: 'abc-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSelectModule, TranslocoPipe],
  template: `
    <mat-select
      class="w-32"
      [value]="locale.current()"
      [aria-label]="'lang.switchLanguage' | transloco"
      (selectionChange)="switchTo($event.value)"
      data-testid="language-switcher"
    >
      @for (code of locales; track code) {
        <mat-option [value]="code" [lang]="code">{{ names[code] }}</mat-option>
      }
    </mat-select>
  `,
})
export class LanguageSwitcher {
  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  protected readonly locales = SUPPORTED_LOCALES;
  protected readonly names = LOCALE_NAMES;

  switchTo(code: Locale): void {
    this.router.navigateByUrl(this.locale.pathPrefix(code) || '/');
  }
}
