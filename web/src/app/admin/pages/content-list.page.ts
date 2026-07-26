import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminApi, AdminContentType, ContentAdminEntry } from '../core/admin-api';
import { problemDetailOf } from '../core/problem-detail';

/** Spec §9.2 content lists: status, per-locale completeness, drag reorder (E-7), and the
 * publish/unpublish/archive lifecycle with the backend's explanations surfaced (task 86). */
@Component({
  selector: 'abc-admin-content-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DragDropModule, MatButtonModule],
  template: `
    <div class="flex items-center gap-4 mb-6">
      <h1 class="text-2xl font-semibold text-brand-navy capitalize">{{ type() }}</h1>
      @if (type() !== 'settings' && type() !== 'sections') {
        <a mat-stroked-button [routerLink]="['/admin/content', type(), 'new']" data-testid="new-entity">New</a>
      }
    </div>

    <div cdkDropList (cdkDropListDropped)="drop($event)" class="grid gap-2">
      @for (entry of entries(); track entry.id) {
        <div
          cdkDrag
          [cdkDragDisabled]="type() === 'settings'"
          class="bg-brand-surface rounded-card shadow-card px-4 py-3 flex items-center gap-4"
          [attr.data-status]="entry.status"
        >
          <span cdkDragHandle class="cursor-grab text-brand-muted" aria-hidden="true">⠿</span>
          <a class="flex-1 underline" [routerLink]="['/admin/content', type(), entry.id]">
            {{ titleOf(entry) }}
          </a>
          <span class="flex gap-1" aria-label="Translation completeness">
            @for (locale of locales; track locale) {
              <span class="text-xs rounded px-1.5 py-0.5"
                [class.bg-green-100]="(entry.completeness[locale] ?? 0) >= 1"
                [class.bg-amber-100]="(entry.completeness[locale] ?? 0) > 0 && (entry.completeness[locale] ?? 0) < 1"
                [class.bg-gray-100]="(entry.completeness[locale] ?? 0) === 0"
              >{{ locale }}</span>
            }
          </span>
          <span class="text-xs font-semibold rounded px-2 py-1"
            [class.bg-green-100]="entry.status === 'PUBLISHED'"
            [class.bg-amber-100]="entry.status === 'DRAFT'"
            [class.bg-gray-200]="entry.status === 'ARCHIVED'"
          >{{ entry.status }}</span>
          @if (entry.status !== 'PUBLISHED') {
            <button mat-stroked-button (click)="publish(entry)" data-testid="publish">Publish</button>
          } @else {
            <button mat-stroked-button (click)="unpublish(entry)">Unpublish</button>
          }
          @if (type() !== 'settings') {
            <button mat-stroked-button (click)="archive(entry)" data-testid="archive">Archive</button>
          }
        </div>
      } @empty {
        <p class="text-brand-muted">Nothing here yet.</p>
      }
    </div>
  `,
})
export class ContentListPage {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly locales = ['en', 'es', 'fr', 'de'];
  protected readonly type = computed(
    () => (this.route.snapshot.paramMap.get('type') ?? 'services') as AdminContentType,
  );

  private readonly list = rxResource({
    params: () => ({ type: this.type() }),
    stream: ({ params }) =>
      this.api
        .listContent(params.type)
        .pipe(map((rows) => [...rows].sort((a, b) => orderOf(a) - orderOf(b)))),
  });

  protected readonly entries = computed(() => this.list.value() ?? []);

  protected titleOf(entry: ContentAdminEntry): string {
    const document = entry.document;
    const named = (document['name'] ?? document['question'] ?? document['quote'] ?? document['heading']) as
      | Record<string, string>
      | undefined;
    return named?.['en'] ?? (document['key'] as string) ?? (document['organisationName'] as string) ?? entry.id;
  }

  async drop(event: CdkDragDrop<ContentAdminEntry[]>): Promise<void> {
    const reordered = [...this.entries()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    await firstValueFrom(this.api.reorder(this.type(), reordered.map((entry) => entry.id)));
    this.list.reload();
  }

  async publish(entry: ContentAdminEntry): Promise<void> {
    try {
      await firstValueFrom(this.api.publish(this.type(), entry.id));
      this.list.reload();
    } catch (error) {
      // Task 86: the specific explanation (consent missing, English incomplete), not a generic toast.
      const problem = problemDetailOf(error);
      this.snackBar.open(problem.explanation, 'Dismiss', { duration: 10000 });
    }
  }

  async unpublish(entry: ContentAdminEntry): Promise<void> {
    await firstValueFrom(this.api.unpublish(this.type(), entry.id));
    this.list.reload();
  }

  async archive(entry: ContentAdminEntry): Promise<void> {
    await firstValueFrom(this.api.archive(this.type(), entry.id));
    this.list.reload();
  }
}

function orderOf(entry: ContentAdminEntry): number {
  return (entry.document['displayOrder'] as number) ?? 0;
}
