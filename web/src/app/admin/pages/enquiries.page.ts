import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminApi, EnquiryEntry } from '../core/admin-api';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'] as const;

/** Spec §9.2 /enquiries (task 89): the inbox with the NEW→CONTACTED→QUALIFIED→CLOSED workflow
 * and per-enquiry notes. The message field is sensitive (spec §13.3) — shown only here, to
 * authenticated staff. */
@Component({
  selector: 'abc-admin-enquiries',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, DatePipe],
  styles: `
    input[type='text'], select { border: 1px solid #e2e5ea; border-radius: 6px; padding: 0.4rem 0.6rem; font: inherit; }
  `,
  template: `
    <div class="flex items-center gap-4 mb-5">
      <h1 class="text-2xl font-semibold text-brand-navy">Enquiries</h1>
      <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" data-testid="status-filter">
        <option value="">All</option>
        @for (status of statuses; track status) {
          <option [value]="status">{{ status }}</option>
        }
      </select>
    </div>

    <div class="grid gap-3">
      @for (enquiry of entries(); track enquiry.id) {
        <details class="bg-brand-surface rounded-card shadow-card" [attr.data-reference]="enquiry.reference">
          <summary class="cursor-pointer px-4 py-3 flex flex-wrap items-center gap-3">
            <b class="text-brand-navy">{{ enquiry.name }}</b>
            <span class="text-brand-muted text-sm">{{ enquiry.reference }}</span>
            <span class="text-sm">{{ enquiry.phone }}</span>
            @if (enquiry.planOfInterest) {
              <span class="text-xs bg-brand-cream rounded px-2 py-0.5">{{ enquiry.planOfInterest }}</span>
            }
            <span class="ml-auto text-xs font-semibold rounded px-2 py-1"
              [class.bg-amber-100]="enquiry.status === 'NEW'"
              [class.bg-blue-100]="enquiry.status === 'CONTACTED'"
              [class.bg-green-100]="enquiry.status === 'QUALIFIED'"
              [class.bg-gray-200]="enquiry.status === 'CLOSED'"
              data-testid="enquiry-status"
            >{{ enquiry.status }}</span>
            <span class="text-xs text-brand-muted">{{ enquiry.createdAt | date: 'short' }}</span>
          </summary>
          <div class="px-4 pb-4 grid gap-3 text-sm border-t border-brand-line pt-3">
            @if (enquiry.message) {
              <p class="bg-brand-cream/60 rounded p-3">{{ enquiry.message }}</p>
            }
            <div class="flex flex-wrap gap-2 items-center">
              <label>
                Status
                <select class="ml-1" [ngModel]="enquiry.status" (ngModelChange)="setStatus(enquiry, $event)"
                  [name]="'status-' + enquiry.id" data-testid="status-select">
                  @for (status of statuses; track status) {
                    <option [value]="status">{{ status }}</option>
                  }
                </select>
              </label>
              <input type="text" class="flex-1 min-w-48" placeholder="Add a note…" #noteInput
                [name]="'note-' + enquiry.id" data-testid="note-input" />
              <button mat-stroked-button (click)="addNote(enquiry, noteInput)" data-testid="add-note">Add note</button>
            </div>
            @if (enquiry.notes.length > 0) {
              <ul class="grid gap-1">
                @for (note of enquiry.notes; track note.at) {
                  <li class="text-brand-muted"><b>{{ note.by }}</b> · {{ note.at | date: 'short' }} — {{ note.text }}</li>
                }
              </ul>
            }
          </div>
        </details>
      } @empty {
        <p class="text-brand-muted">No enquiries{{ statusFilter() ? ' with this status' : '' }}.</p>
      }
    </div>
  `,
})
export class EnquiriesPage {
  private readonly api = inject(AdminApi);

  protected readonly statuses = STATUSES;
  protected readonly statusFilter = signal('');

  private readonly list = rxResource({
    params: () => ({ status: this.statusFilter() }),
    stream: ({ params }) => this.api.enquiries(params.status || undefined),
  });

  protected readonly entries = computed(() => this.list.value() ?? []);

  async setStatus(enquiry: EnquiryEntry, status: string): Promise<void> {
    await firstValueFrom(this.api.updateEnquiry(enquiry.id, { status }));
    this.list.reload();
  }

  async addNote(enquiry: EnquiryEntry, input: HTMLInputElement): Promise<void> {
    const note = input.value.trim();
    if (!note) {
      return;
    }
    await firstValueFrom(this.api.updateEnquiry(enquiry.id, { note }));
    input.value = '';
    this.list.reload();
  }
}
