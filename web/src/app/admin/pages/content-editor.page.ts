import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AdminApi, AdminContentType, ContentRevisionEntry } from '../core/admin-api';
import { EDITOR_CONFIG, FieldDef, deepGet, deepSet } from '../core/editor-config';
import { problemDetailOf, ProblemInfo } from '../core/problem-detail';
import { UnsavedChangesAware } from '../core/admin-guards';
import { PreviewPane } from '../ui/preview-pane';
import { Locale, SUPPORTED_LOCALES } from '../../core/i18n/locales';

type Localized = Record<string, string>;

/**
 * The one editor pattern every content type follows (spec §9.3): locale tab strip with
 * completeness glyphs (E-1), English source under non-English fields (E-2), English mandatory
 * (E-3), unsaved-changes guard (E-4), drag-reorderable lists (E-7), a live preview rendering the
 * actual public component (E-8), and the backend's optimistic-lock/consent/completeness
 * refusals surfaced with their specific explanations (E-6, E-9, E-10 / task 86).
 */
@Component({
  selector: 'abc-admin-content-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DragDropModule, MatButtonModule, PreviewPane],
  styles: `
    /* Same darkened CMS teal as the shell — white on #17a9ce is only 2.8:1. */
    .locale-tab.active { background: #10758e; color: white; }
    textarea, input[type='text'], input[type='number'], select {
      border: 1px solid var(--color-brand-line, #e2e5ea);
      border-radius: 6px;
      padding: 0.5rem 0.65rem;
      width: 100%;
      font: inherit;
    }
  `,
  template: `
    <div class="flex items-center gap-3 mb-4">
      <h1 class="text-2xl font-semibold text-brand-navy capitalize">
        {{ type() }} <span class="text-brand-muted text-base">· {{ status() }}</span>
      </h1>
      <span class="flex-1"></span>
      <button mat-stroked-button (click)="save()" [disabled]="!dirty()" data-testid="save">Save draft</button>
      <button mat-flat-button (click)="saveAndPublish()" data-testid="save-publish">Save and publish</button>
    </div>

    @if (conflict(); as conflict) {
      <div class="mb-4 border border-amber-400 bg-amber-50 rounded-card p-4" role="alert" data-testid="conflict-panel">
        <b>{{ conflict.title }}</b>
        <p class="text-sm mt-1">
          Someone else saved version {{ conflict.currentVersion }} while you edited. Fields that differ:
          <b data-testid="conflict-fields">{{ conflictFields().join(', ') || '(none)' }}</b>
        </p>
        <div class="flex gap-2 mt-2">
          <button mat-stroked-button (click)="takeTheirs()">Load their version</button>
          <button mat-stroked-button (click)="keepMine()">Keep mine and retry</button>
        </div>
      </div>
    }
    @if (publishProblem(); as problem) {
      <div class="mb-4 border border-red-300 bg-red-50 rounded-card p-4" role="alert" data-testid="publish-problem">
        <b>{{ problem.title }}</b>
        <p class="text-sm mt-1">{{ problem.explanation }}</p>
      </div>
    }

    <div class="flex gap-1 mb-4" role="tablist" aria-label="Locales">
      @for (locale of locales; track locale) {
        <button
          class="locale-tab rounded px-3 py-1.5 text-sm border border-brand-line"
          role="tab"
          [class.active]="activeLocale() === locale"
          [attr.aria-selected]="activeLocale() === locale"
          (click)="activeLocale.set(locale)"
          [attr.data-testid]="'tab-' + locale"
        >
          {{ locale.toUpperCase() }} {{ glyph(locale) }}
        </button>
      }
    </div>

    <div class="grid xl:grid-cols-2 gap-6 items-start">
      <form class="grid gap-4 bg-brand-surface rounded-card shadow-card p-5" (submit)="$event.preventDefault()">
        @for (field of fields(); track field.key) {
          <div class="grid gap-1">
            <label class="text-sm font-medium text-brand-navy" [for]="field.key">
              {{ field.label }}
              @if (field.requiredEn && activeLocale() === 'en') {
                <span class="text-red-700" aria-hidden="true">*</span>
              }
            </label>

            @switch (field.kind) {
              @case ('text') {
                <input type="text" [id]="field.key" [readonly]="field.readonly"
                  [ngModel]="textValue(field)" (ngModelChange)="setText(field, $event)" [name]="field.key" />
              }
              @case ('number') {
                <input type="number" [id]="field.key"
                  [ngModel]="numberValue(field)" (ngModelChange)="setNumber(field, $event)" [name]="field.key" />
              }
              @case ('boolean') {
                <input type="checkbox" [id]="field.key" class="w-5 h-5"
                  [ngModel]="boolValue(field)" (ngModelChange)="setBool(field, $event)" [name]="field.key" />
              }
              @case ('select') {
                <select [id]="field.key" [ngModel]="textValue(field)" (ngModelChange)="setText(field, $event)" [name]="field.key">
                  @for (option of field.options; track option) {
                    <option [value]="option">{{ option }}</option>
                  }
                </select>
              }
              @case ('localized') {
                <input type="text" [id]="field.key"
                  [ngModel]="localizedValue(field)" (ngModelChange)="setLocalized(field, $event)" [name]="field.key"
                  [attr.data-testid]="'field-' + field.key" />
                @if (activeLocale() !== 'en') {
                  <p class="text-xs text-brand-muted" data-testid="en-reference">EN: {{ englishOf(field) }}</p>
                }
              }
              @case ('localized-area') {
                <textarea rows="3" [id]="field.key"
                  [ngModel]="localizedValue(field)" (ngModelChange)="setLocalized(field, $event)" [name]="field.key"></textarea>
                @if (activeLocale() !== 'en') {
                  <p class="text-xs text-brand-muted" data-testid="en-reference">EN: {{ englishOf(field) }}</p>
                }
              }
              @case ('string-list') {
                <div cdkDropList (cdkDropListDropped)="reorderList(field, $event)" class="grid gap-2">
                  @for (entry of stringList(field); track $index) {
                    <div cdkDrag class="flex gap-2 items-center">
                      <span cdkDragHandle class="cursor-grab text-brand-muted">⠿</span>
                      <input type="text" [ngModel]="entry" (ngModelChange)="setStringListEntry(field, $index, $event)"
                        [name]="field.key + $index" />
                      <button mat-stroked-button type="button" (click)="removeListEntry(field, $index)">×</button>
                    </div>
                  }
                </div>
                <button mat-stroked-button type="button" (click)="addStringListEntry(field)">+ Add</button>
              }
              @case ('localized-list') {
                <div cdkDropList (cdkDropListDropped)="reorderList(field, $event)" class="grid gap-2" data-testid="localized-list">
                  @for (entry of localizedList(field); track $index) {
                    <div cdkDrag class="flex gap-2 items-center">
                      <span cdkDragHandle class="cursor-grab text-brand-muted" data-testid="drag-handle">⠿</span>
                      <input type="text" [ngModel]="entry[activeLocale()] ?? ''"
                        (ngModelChange)="setLocalizedListEntry(field, $index, $event)" [name]="field.key + $index" />
                      <button mat-stroked-button type="button" (click)="removeListEntry(field, $index)">×</button>
                    </div>
                    @if (activeLocale() !== 'en') {
                      <p class="text-xs text-brand-muted ml-7 -mt-1">EN: {{ entry['en'] ?? '' }}</p>
                    }
                  }
                </div>
                <button mat-stroked-button type="button" (click)="addLocalizedListEntry(field)">+ Add</button>
              }
              @case ('section-items') {
                <div cdkDropList (cdkDropListDropped)="reorderList(field, $event)" class="grid gap-3">
                  @for (item of itemList(field); track $index) {
                    <fieldset cdkDrag class="border border-brand-line rounded p-3 grid gap-2">
                      <legend class="text-xs text-brand-muted px-1">
                        <span cdkDragHandle class="cursor-grab">⠿</span> {{ item['key'] }}
                      </legend>
                      <input type="text" placeholder="Title"
                        [ngModel]="localizedOf(item['title'])" (ngModelChange)="setItemField(field, $index, 'title', $event)"
                        [name]="field.key + $index + 'title'" />
                      <textarea rows="2" placeholder="Body"
                        [ngModel]="localizedOf(item['body'])" (ngModelChange)="setItemField(field, $index, 'body', $event)"
                        [name]="field.key + $index + 'body'"></textarea>
                    </fieldset>
                  }
                </div>
              }
              @case ('plan-features') {
                <div cdkDropList (cdkDropListDropped)="reorderList(field, $event)" class="grid gap-2">
                  @for (feature of itemList(field); track $index) {
                    <div cdkDrag class="flex gap-2 items-center">
                      <span cdkDragHandle class="cursor-grab text-brand-muted">⠿</span>
                      <input type="text" class="flex-1"
                        [ngModel]="localizedOf(feature['label'])" (ngModelChange)="setItemField(field, $index, 'label', $event)"
                        [name]="field.key + $index + 'label'" />
                      <label class="text-xs flex items-center gap-1">
                        <input type="checkbox" [ngModel]="feature['included']"
                          (ngModelChange)="setItemFlag(field, $index, 'included', $event)" [name]="field.key + $index + 'inc'" />
                        incl.
                      </label>
                      <label class="text-xs flex items-center gap-1">
                        <input type="checkbox" [ngModel]="feature['emphasised']"
                          (ngModelChange)="setItemFlag(field, $index, 'emphasised', $event)" [name]="field.key + $index + 'emp'" />
                        bold
                      </label>
                    </div>
                  }
                </div>
              }
            }
          </div>
        }
      </form>

      <div class="grid gap-4">
        <h2 class="text-sm font-semibold text-brand-muted uppercase">Preview ({{ activeLocale().toUpperCase() }})</h2>
        <abc-preview-pane [type]="type()" [document]="documentSnapshot()" [locale]="activeLocale()" />

        @if (revisions().length > 0) {
          <details class="bg-brand-surface rounded-card shadow-card p-4">
            <summary class="cursor-pointer font-medium text-brand-navy">Revisions ({{ revisions().length }})</summary>
            <ul class="mt-3 grid gap-2 text-sm">
              @for (revision of revisions(); track revision.revisionNumber) {
                <li class="flex items-center gap-3 border-t border-brand-line pt-2">
                  <span>#{{ revision.revisionNumber }} · {{ revision.status }} · {{ revision.changeSummary }}</span>
                  <span class="text-brand-muted">{{ revision.createdBy }}</span>
                  <button mat-stroked-button class="ml-auto" (click)="restore(revision)" data-testid="restore">
                    Restore
                  </button>
                </li>
              }
            </ul>
          </details>
        }
      </div>
    </div>
  `,
})
export class ContentEditorPage implements UnsavedChangesAware {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly locales = SUPPORTED_LOCALES;
  protected readonly activeLocale = signal<Locale>('en');

  protected readonly type = signal<AdminContentType>('services');
  private readonly id = signal<string>('new');
  protected readonly status = signal('DRAFT');
  private version = 0;

  /** The live draft; documentVersion bumps notify signals after in-place edits. */
  private document: Record<string, unknown> = {};
  private readonly documentVersion = signal(0);
  protected readonly dirty = signal(false);

  protected readonly conflict = signal<ProblemInfo | null>(null);
  protected readonly publishProblem = signal<ProblemInfo | null>(null);
  protected readonly revisions = signal<ContentRevisionEntry[]>([]);

  protected readonly fields = computed<FieldDef[]>(() => EDITOR_CONFIG[this.type()]);
  protected readonly documentSnapshot = computed<Record<string, unknown>>(() => {
    this.documentVersion();
    return { ...this.document };
  });

  constructor() {
    const params = this.route.snapshot.paramMap;
    this.type.set((params.get('type') ?? 'services') as AdminContentType);
    this.id.set(params.get('id') ?? 'new');
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.id() === 'new') {
      this.document = {};
      this.documentVersion.update((n) => n + 1);
      return;
    }
    const entry = await firstValueFrom(this.api.getContent(this.type(), this.id()));
    this.document = structuredClone(entry.document);
    this.status.set(entry.status);
    this.version = entry.version ?? 0;
    this.documentVersion.update((n) => n + 1);
    try {
      this.revisions.set(await firstValueFrom(this.api.revisions(this.type(), this.id())));
    } catch {
      this.revisions.set([]);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  /** E-1: per-locale glyph across this type's localized fields. */
  protected glyph(locale: Locale): string {
    let total = 0;
    let filled = 0;
    for (const field of this.fields()) {
      if (field.kind === 'localized' || field.kind === 'localized-area') {
        const value = deepGet(this.documentSnapshot(), field.key) as Localized | undefined;
        if (value && Object.values(value).some((entry) => entry?.trim())) {
          total++;
          if (value[locale]?.trim()) {
            filled++;
          }
        }
      }
    }
    if (total === 0) {
      return '✓';
    }
    return filled === total ? '✓' : filled === 0 ? '○' : '⚠';
  }

  protected englishOf(field: FieldDef): string {
    const value = deepGet(this.documentSnapshot(), field.key) as Localized | undefined;
    return value?.['en'] ?? '';
  }

  protected localizedOf(value: unknown): string {
    return ((value as Localized | undefined)?.[this.activeLocale()] ?? '') as string;
  }

  // --- field accessors -------------------------------------------------------------------
  protected textValue(field: FieldDef): string {
    return String(deepGet(this.documentSnapshot(), field.key) ?? '');
  }

  protected numberValue(field: FieldDef): number | null {
    const value = deepGet(this.documentSnapshot(), field.key);
    return typeof value === 'number' ? value : value != null ? Number(value) : null;
  }

  protected boolValue(field: FieldDef): boolean {
    return Boolean(deepGet(this.documentSnapshot(), field.key));
  }

  protected localizedValue(field: FieldDef): string {
    return this.localizedOf(deepGet(this.documentSnapshot(), field.key));
  }

  protected stringList(field: FieldDef): string[] {
    return (deepGet(this.documentSnapshot(), field.key) as string[]) ?? [];
  }

  protected localizedList(field: FieldDef): Localized[] {
    return (deepGet(this.documentSnapshot(), field.key) as Localized[]) ?? [];
  }

  protected itemList(field: FieldDef): Array<Record<string, unknown>> {
    return (deepGet(this.documentSnapshot(), field.key) as Array<Record<string, unknown>>) ?? [];
  }

  // --- mutations -------------------------------------------------------------------------
  private touch(): void {
    this.dirty.set(true);
    this.documentVersion.update((n) => n + 1);
  }

  protected setText(field: FieldDef, value: string): void {
    if (field.readonly) {
      return;
    }
    deepSet(this.document, field.key, value);
    this.touch();
  }

  protected setNumber(field: FieldDef, value: number): void {
    deepSet(this.document, field.key, Number(value));
    this.touch();
  }

  protected setBool(field: FieldDef, value: boolean): void {
    deepSet(this.document, field.key, Boolean(value));
    this.touch();
  }

  protected setLocalized(field: FieldDef, value: string): void {
    const existing = (deepGet(this.document, field.key) as Localized) ?? {};
    deepSet(this.document, field.key, { ...existing, [this.activeLocale()]: value });
    this.touch();
  }

  protected setStringListEntry(field: FieldDef, index: number, value: string): void {
    const list = [...this.stringList(field)];
    list[index] = value;
    deepSet(this.document, field.key, list);
    this.touch();
  }

  protected setLocalizedListEntry(field: FieldDef, index: number, value: string): void {
    const list = this.localizedList(field).map((entry) => ({ ...entry }));
    list[index] = { ...list[index], [this.activeLocale()]: value };
    deepSet(this.document, field.key, list);
    this.touch();
  }

  protected setItemField(field: FieldDef, index: number, key: string, value: string): void {
    const list = this.itemList(field).map((item) => ({ ...item }));
    const localized = ((list[index][key] as Localized) ?? {}) as Localized;
    list[index][key] = { ...localized, [this.activeLocale()]: value };
    deepSet(this.document, field.key, list);
    this.touch();
  }

  protected setItemFlag(field: FieldDef, index: number, key: string, value: boolean): void {
    const list = this.itemList(field).map((item) => ({ ...item }));
    list[index][key] = Boolean(value);
    deepSet(this.document, field.key, list);
    this.touch();
  }

  protected addStringListEntry(field: FieldDef): void {
    deepSet(this.document, field.key, [...this.stringList(field), '']);
    this.touch();
  }

  protected addLocalizedListEntry(field: FieldDef): void {
    deepSet(this.document, field.key, [...this.localizedList(field), {}]);
    this.touch();
  }

  protected removeListEntry(field: FieldDef, index: number): void {
    const list = [...(deepGet(this.document, field.key) as unknown[])];
    list.splice(index, 1);
    deepSet(this.document, field.key, list);
    this.touch();
  }

  /** E-7: drag reorder for bullets, features and section items. */
  protected reorderList(field: FieldDef, event: CdkDragDrop<unknown>): void {
    const list = [...(deepGet(this.document, field.key) as unknown[])];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    deepSet(this.document, field.key, list);
    this.touch();
  }

  // --- persistence -----------------------------------------------------------------------
  /** E-3: English is mandatory before saving. */
  private missingEnglish(): string[] {
    return this.fields()
      .filter((field) => field.requiredEn)
      .filter((field) => !((deepGet(this.document, field.key) as Localized | undefined)?.['en'] ?? '').trim())
      .map((field) => field.label);
  }

  async save(): Promise<boolean> {
    const missing = this.missingEnglish();
    if (missing.length > 0) {
      this.snackBar.open(`English is mandatory for: ${missing.join(', ')}`, 'Dismiss', { duration: 8000 });
      return false;
    }
    try {
      if (this.id() === 'new') {
        const created = await firstValueFrom(this.api.createContent(this.type(), this.document));
        this.id.set(created.id);
        await this.router.navigate(['/admin/content', this.type(), created.id], { replaceUrl: true });
      } else {
        const updated = await firstValueFrom(
          this.api.updateContent(this.type(), this.id(), this.document, this.version),
        );
        this.version = updated.version ?? this.version + 1;
      }
      this.dirty.set(false);
      this.conflict.set(null);
      try {
        this.revisions.set(await firstValueFrom(this.api.revisions(this.type(), this.id())));
      } catch {
        /* settings has no revisions endpoint semantics */
      }
      return true;
    } catch (error) {
      const problem = problemDetailOf(error);
      if (problem.status === 409 && problem.currentVersion !== null) {
        this.conflict.set(problem); // E-9: the loser is offered a diff
      } else {
        this.snackBar.open(problem.explanation, 'Dismiss', { duration: 8000 });
      }
      return false;
    }
  }

  async saveAndPublish(): Promise<void> {
    this.publishProblem.set(null);
    if (this.dirty() || this.id() === 'new') {
      const saved = await this.save();
      if (!saved) {
        return;
      }
    }
    try {
      await firstValueFrom(this.api.publish(this.type(), this.id()));
      this.status.set('PUBLISHED');
      this.snackBar.open('Published.', undefined, { duration: 3000 });
    } catch (error) {
      // E-6/E-10: blocked with the specific reason - incomplete English fields or missing consent.
      this.publishProblem.set(problemDetailOf(error));
    }
  }

  /** E-9 diff support: top-level fields whose values differ between my draft and theirs. */
  protected conflictFields(): string[] {
    const theirs = this.conflict()?.current ?? {};
    return Object.keys({ ...this.document, ...theirs }).filter(
      (key) =>
        !['_id', 'version', 'updatedAt', 'updatedBy'].includes(key) &&
        JSON.stringify(this.document[key]) !== JSON.stringify((theirs as Record<string, unknown>)[key]),
    );
  }

  protected takeTheirs(): void {
    const theirs = this.conflict();
    if (!theirs?.current) {
      return;
    }
    this.document = structuredClone(theirs.current);
    delete this.document['_id'];
    this.version = theirs.currentVersion ?? this.version;
    this.conflict.set(null);
    this.dirty.set(false);
    this.documentVersion.update((n) => n + 1);
  }

  protected async keepMine(): Promise<void> {
    const theirs = this.conflict();
    if (theirs?.currentVersion == null) {
      return;
    }
    this.version = theirs.currentVersion;
    this.conflict.set(null);
    await this.save();
  }

  protected async restore(revision: ContentRevisionEntry): Promise<void> {
    await firstValueFrom(this.api.restore(this.type(), this.id(), revision.revisionNumber));
    await this.load();
    this.snackBar.open(`Restored revision #${revision.revisionNumber}.`, undefined, { duration: 3000 });
  }
}
