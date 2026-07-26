import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminApi } from '../core/admin-api';
import { problemDetailOf } from '../core/problem-detail';

/** Spec §9.2 /media (task 88): upload, browse, orphan report, and deletion that explains WHICH
 * entities still reference an asset instead of failing generically. */
@Component({
  selector: 'abc-admin-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, DecimalPipe],
  template: `
    <div class="flex items-center gap-4 mb-5">
      <h1 class="text-2xl font-semibold text-brand-navy">Media</h1>
      <label class="cursor-pointer border border-brand-line rounded px-3 py-1.5 text-sm bg-brand-surface">
        Upload image
        <input type="file" accept="image/jpeg,image/png" class="hidden" (change)="upload($event)" data-testid="upload-input" />
      </label>
      <label class="text-sm flex items-center gap-1">
        <input type="checkbox" [ngModel]="orphansOnly()" (ngModelChange)="orphansOnly.set($event)" data-testid="orphans-only" />
        Orphans only
      </label>
    </div>

    @if (deleteProblem(); as problem) {
      <div class="mb-4 border border-red-300 bg-red-50 rounded-card p-4" role="alert" data-testid="delete-problem">
        <b>{{ problem.title }}</b>
        <p class="text-sm mt-1">{{ problem.explanation }}</p>
        @if (referencedBy().length > 0) {
          <ul class="text-sm mt-1 list-disc ml-5" data-testid="referencing-entities">
            @for (reference of referencedBy(); track reference.entityId) {
              <li>{{ reference.entityType }} · {{ reference.entityId }}</li>
            }
          </ul>
        }
      </div>
    }

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      @for (asset of assets(); track asset.id) {
        <figure class="bg-brand-surface rounded-card shadow-card overflow-hidden" [attr.data-media-id]="asset.id">
          <img [src]="asset.url" [alt]="asset.alt['en'] ?? asset.filename" loading="lazy" class="w-full h-36 object-cover bg-brand-line" />
          <figcaption class="p-3 text-xs grid gap-1">
            <b class="truncate">{{ asset.filename }}</b>
            <span class="text-brand-muted">
              {{ asset.width }}×{{ asset.height }} · {{ asset.bytes / 1024 | number: '1.0-0' }} kB
            </span>
            <span>
              @if (asset.referencedBy.length > 0) {
                <span class="bg-green-100 rounded px-1.5 py-0.5">used ×{{ asset.referencedBy.length }}</span>
              } @else {
                <span class="bg-amber-100 rounded px-1.5 py-0.5">orphan</span>
              }
            </span>
            <button mat-stroked-button (click)="remove(asset.id)" data-testid="delete-media">Delete</button>
          </figcaption>
        </figure>
      } @empty {
        <p class="text-brand-muted">No media yet — upload the hero and section imagery here.</p>
      }
    </div>
  `,
})
export class MediaPage {
  private readonly api = inject(AdminApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly orphansOnly = signal(false);
  protected readonly deleteProblem = signal<ReturnType<typeof problemDetailOf> | null>(null);

  private readonly list = rxResource({
    params: () => ({ orphans: this.orphansOnly() }),
    stream: ({ params }) => this.api.media(params.orphans),
  });

  protected readonly assets = computed(() => this.list.value() ?? []);
  protected readonly referencedBy = computed(
    () =>
      (this.deleteProblem()?.raw['referencedBy'] as Array<{ entityType: string; entityId: string }> | undefined) ?? [],
  );

  async upload(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    try {
      await firstValueFrom(this.api.uploadMedia(file));
      this.list.reload();
      this.snackBar.open('Uploaded.', undefined, { duration: 3000 });
    } catch (error) {
      this.snackBar.open(problemDetailOf(error).explanation, 'Dismiss', { duration: 8000 });
    }
  }

  async remove(id: string): Promise<void> {
    this.deleteProblem.set(null);
    try {
      await firstValueFrom(this.api.deleteMedia(id));
      this.list.reload();
    } catch (error) {
      // Task 88: show WHICH entities reference it, not just a failure.
      this.deleteProblem.set(problemDetailOf(error));
    }
  }
}
