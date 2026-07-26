import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminApi } from '../core/admin-api';

/** Spec §9.2 /audit — ADMIN-only via the route guard (task 90). */
@Component({
  selector: 'abc-admin-audit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, JsonPipe],
  template: `
    <h1 class="text-2xl font-semibold text-brand-navy mb-4">Audit trail</h1>
    <div class="overflow-x-auto bg-brand-surface rounded-card shadow-card">
      <table class="w-full text-sm min-w-[640px]" data-testid="audit-table">
        <thead>
          <tr class="text-left text-brand-muted border-b border-brand-line">
            <th class="p-3">When</th><th class="p-3">Actor</th><th class="p-3">Action</th>
            <th class="p-3">Entity</th><th class="p-3">Detail</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of entries(); track entry.id) {
            <tr class="border-b border-brand-line align-top">
              <td class="p-3 whitespace-nowrap">{{ entry.at | date: 'medium' }}</td>
              <td class="p-3">{{ entry.actorId }}</td>
              <td class="p-3 font-mono text-xs">{{ entry.action }}</td>
              <td class="p-3">{{ entry.entityType }} {{ entry.entityId }}</td>
              <td class="p-3 font-mono text-xs">{{ entry.detail | json }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AuditPage {
  private readonly api = inject(AdminApi);
  private readonly list = rxResource({ stream: () => this.api.audit() });
  protected readonly entries = computed(() => this.list.value() ?? []);
}
