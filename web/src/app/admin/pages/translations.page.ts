import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PercentPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminApi } from '../core/admin-api';
import { Locale, SUPPORTED_LOCALES } from '../../core/i18n/locales';

interface WorkRow {
  key: string;
  english: string;
  value: string;
  isOverride: boolean;
  missing: boolean;
}

/**
 * The translation workspace (spec §9.4, T-1..T-7): one row per UI string key, English source
 * beside the locale value, [DEF] marking shipped defaults with one-click revert, a missing-only
 * filter whose coverage bar follows the filter, and JSON export/import with a diff preview
 * before anything is applied.
 */
@Component({
  selector: 'abc-admin-translations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, PercentPipe],
  styles: `
    input[type='text'] { border: 1px solid #e2e5ea; border-radius: 6px; padding: 0.4rem 0.6rem; width: 100%; font: inherit; }
    .admin-bar { background: #17a9ce; }
  `,
  template: `
    <div class="flex flex-wrap items-center gap-4 mb-5">
      <h1 class="text-2xl font-semibold text-brand-navy">Translations</h1>
      <label class="text-sm">
        Locale
        <select [ngModel]="locale()" (ngModelChange)="locale.set($event)" class="ml-2 border border-brand-line rounded px-2 py-1" data-testid="locale-select">
          @for (code of editableLocales; track code) {
            <option [value]="code">{{ code.toUpperCase() }}</option>
          }
        </select>
      </label>
      <label class="text-sm flex items-center gap-1">
        <input type="checkbox" [ngModel]="missingOnly()" (ngModelChange)="missingOnly.set($event)" data-testid="missing-only" />
        Missing only
      </label>
      <span class="flex items-center gap-2 text-sm min-w-44" data-testid="coverage-bar">
        {{ coverage() | percent: '1.0-0' }}
        <span class="flex-1 h-2 rounded bg-brand-line overflow-hidden">
          <span class="block h-full admin-bar" [style.width.%]="coverage() * 100"></span>
        </span>
      </span>
      <span class="flex-1"></span>
      <button mat-stroked-button (click)="exportLocale()" data-testid="export">Export JSON</button>
      <label mat-stroked-button class="cursor-pointer border border-brand-line rounded px-3 py-1.5 text-sm">
        Import JSON
        <input type="file" accept="application/json" class="hidden" (change)="importFile($event)" data-testid="import-input" />
      </label>
    </div>

    @if (importDiff(); as diff) {
      <div class="mb-5 border border-amber-400 bg-amber-50 rounded-card p-4" data-testid="import-diff">
        <b>Import preview — {{ diff.length }} change(s)</b>
        <ul class="text-sm mt-2 grid gap-1 max-h-56 overflow-y-auto">
          @for (change of diff; track change.key) {
            <li><code>{{ change.key }}</code>: “{{ change.from }}” → “{{ change.to }}”</li>
          }
        </ul>
        <div class="flex gap-2 mt-3">
          <button mat-flat-button (click)="applyImport()" data-testid="apply-import">Apply {{ diff.length }} change(s)</button>
          <button mat-stroked-button (click)="importDiff.set(null)">Discard</button>
        </div>
      </div>
    }

    <div class="overflow-x-auto bg-brand-surface rounded-card shadow-card">
      <table class="w-full text-sm min-w-[720px]">
        <thead>
          <tr class="text-left text-brand-muted border-b border-brand-line">
            <th class="p-3">Key</th>
            <th class="p-3">English (source)</th>
            <th class="p-3">{{ locale().toUpperCase() }}</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          @for (row of filteredRows(); track row.key) {
            <tr class="border-b border-brand-line align-top" [attr.data-key]="row.key">
              <td class="p-3 font-mono text-xs">{{ row.key }}</td>
              <td class="p-3 text-brand-muted">{{ row.english }}</td>
              <td class="p-3">
                <input type="text" [ngModel]="row.value" (ngModelChange)="stage(row.key, $event)"
                  [attr.aria-label]="row.key" [name]="row.key" />
                @if (row.missing) {
                  <span class="text-xs text-amber-700">⚠ untranslated</span>
                }
              </td>
              <td class="p-3 whitespace-nowrap">
                @if (!row.isOverride) {
                  <span class="text-xs bg-gray-100 rounded px-1.5 py-0.5" title="Shipped default" data-testid="def-marker">DEF</span>
                } @else {
                  <button mat-stroked-button (click)="revert(row.key)" data-testid="revert">Revert</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (staged().size > 0) {
      <div class="sticky bottom-4 mt-4 flex justify-end">
        <button mat-flat-button (click)="saveStaged()" data-testid="save-staged">
          Save {{ staged().size }} change(s)
        </button>
      </div>
    }
  `,
})
export class TranslationsPage {
  private readonly api = inject(AdminApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly editableLocales = SUPPORTED_LOCALES;
  protected readonly locale = signal<Locale>('es');
  protected readonly missingOnly = signal(false);
  protected readonly staged = signal(new Map<string, string>());
  protected readonly importDiff = signal<Array<{ key: string; from: string; to: string }> | null>(null);

  private readonly english = rxResource({ stream: () => this.api.i18nOverrides('en') });
  private readonly current = rxResource({
    params: () => ({ locale: this.locale() }),
    stream: ({ params }) => this.api.i18nOverrides(params.locale),
  });

  protected readonly rows = computed<WorkRow[]>(() => {
    const englishView = this.english.value();
    const localeView = this.current.value();
    if (!englishView || !localeView) {
      return [];
    }
    const englishMerged = { ...englishView.defaults, ...englishView.overrides };
    return Object.keys(englishMerged)
      .sort()
      .map((key) => {
        const overridden = key in localeView.overrides;
        const value = overridden ? localeView.overrides[key] : (localeView.defaults[key] ?? '');
        return {
          key,
          english: englishMerged[key],
          value,
          isOverride: overridden,
          missing: !value.trim(),
        };
      });
  });

  /** T-2: the coverage bar reflects the current filter's population. */
  protected readonly filteredRows = computed(() =>
    this.missingOnly() ? this.rows().filter((row) => row.missing) : this.rows(),
  );
  protected readonly coverage = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) {
      return 1;
    }
    return rows.filter((row) => !row.missing).length / rows.length;
  });

  protected stage(key: string, value: string): void {
    const next = new Map(this.staged());
    next.set(key, value);
    this.staged.set(next);
  }

  /** T-3: edits write to uiTranslationOverrides — never to the shipped JSON files. */
  async saveStaged(): Promise<void> {
    const entries = Object.fromEntries(this.staged());
    await firstValueFrom(this.api.putI18nOverrides(this.locale(), entries));
    this.staged.set(new Map());
    this.current.reload();
    this.snackBar.open('Overrides saved.', undefined, { duration: 3000 });
  }

  /** T-4: one-click revert to the shipped default. */
  async revert(key: string): Promise<void> {
    await firstValueFrom(this.api.deleteI18nOverride(this.locale(), key));
    this.current.reload();
  }

  /** T-5: export the whole locale (defaults merged with overrides) as a JSON download. */
  protected exportLocale(): void {
    const view = this.current.value();
    if (!view) {
      return;
    }
    const merged = { ...view.defaults, ...view.overrides };
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${this.locale()}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  /** T-6: import is validated and previewed as a diff before anything is applied. */
  protected async importFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    let imported: Record<string, string>;
    try {
      imported = JSON.parse(await file.text()) as Record<string, string>;
    } catch {
      this.snackBar.open('Not a valid JSON file.', 'Dismiss', { duration: 5000 });
      return;
    }
    this.importDiff.set(this.diffAgainstCurrent(imported));
  }

  diffAgainstCurrent(imported: Record<string, string>): Array<{ key: string; from: string; to: string }> {
    const known = new Map(this.rows().map((row) => [row.key, row.value]));
    return Object.entries(imported)
      .filter(([key]) => known.has(key))
      .filter(([key, value]) => known.get(key) !== value)
      .map(([key, value]) => ({ key, from: known.get(key) ?? '', to: value }));
  }

  async applyImport(): Promise<void> {
    const diff = this.importDiff() ?? [];
    if (diff.length === 0) {
      this.importDiff.set(null);
      return;
    }
    const entries = Object.fromEntries(diff.map((change) => [change.key, change.to]));
    await firstValueFrom(this.api.putI18nOverrides(this.locale(), entries));
    this.importDiff.set(null);
    this.current.reload();
    this.snackBar.open(`${diff.length} change(s) applied.`, undefined, { duration: 3000 });
  }
}
