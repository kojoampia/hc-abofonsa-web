import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, PercentPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { AdminApi, AdminContentType, ContentAdminEntry } from '../core/admin-api';

const CONTENT_TYPES: AdminContentType[] = ['sections', 'services', 'plans', 'testimonials', 'faqs'];
const STALE_DRAFT_DAYS = 7;

/** Spec §9.6 dashboard: publication state (stale drafts highlighted), translation coverage bars
 * linking into the workspace, new enquiries, and recent audit activity. */
@Component({
  selector: 'abc-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PercentPipe],
  template: `
    <h1 class="text-2xl font-semibold text-brand-navy mb-6">Dashboard</h1>
    <div class="grid lg:grid-cols-2 gap-6">
      <section class="bg-brand-surface rounded-card shadow-card p-5" aria-labelledby="pub-state">
        <h2 id="pub-state" class="font-semibold text-brand-navy mb-3">Publication state</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-brand-muted">
              <th class="py-1">Type</th><th>Published</th><th>Draft</th><th>Archived</th>
            </tr>
          </thead>
          <tbody>
            @for (row of publicationState(); track row.type) {
              <tr class="border-t border-brand-line">
                <td class="py-1.5"><a class="underline" [routerLink]="['/admin/content', row.type]">{{ row.type }}</a></td>
                <td>{{ row.published }}</td>
                <td>
                  {{ row.draft }}
                  @if (row.staleDrafts > 0) {
                    <span class="ml-1 text-xs bg-amber-200 text-amber-900 rounded px-1.5 py-0.5" data-testid="stale-draft-badge">
                      {{ row.staleDrafts }} &gt; {{ staleDays }}d
                    </span>
                  }
                </td>
                <td>{{ row.archived }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <section class="bg-brand-surface rounded-card shadow-card p-5" aria-labelledby="coverage">
        <h2 id="coverage" class="font-semibold text-brand-navy mb-3">Translation coverage</h2>
        @for (entry of coverage.value() ?? []; track entry.locale) {
          <a class="block mb-3" [routerLink]="['/admin/translations']" [queryParams]="{ locale: entry.locale }">
            <span class="flex justify-between text-sm">
              <span class="uppercase">{{ entry.locale }}</span>
              <span>{{ entry.contentCompleteness | percent: '1.0-0' }}</span>
            </span>
            <span class="block h-2 rounded bg-brand-line overflow-hidden">
              <span class="block h-full admin-bar" [style.width.%]="entry.contentCompleteness * 100"></span>
            </span>
            @if (entry.missingUiKeys.length > 0) {
              <span class="text-xs text-amber-700">{{ entry.missingUiKeys.length }} UI keys missing</span>
            }
          </a>
        }
      </section>

      <section class="bg-brand-surface rounded-card shadow-card p-5" aria-labelledby="enquiries-widget">
        <h2 id="enquiries-widget" class="font-semibold text-brand-navy mb-3">
          Enquiries
          <span class="ml-2 text-sm bg-brand-navy text-white rounded-full px-2 py-0.5" data-testid="new-enquiry-count">
            {{ newEnquiries() }}
          </span>
          new
        </h2>
        <ul class="text-sm grid gap-2">
          @for (enquiry of recentEnquiries(); track enquiry.id) {
            <li class="border-t border-brand-line pt-2 flex justify-between gap-2">
              <span>{{ enquiry.name }} · {{ enquiry.reference }}</span>
              <span class="text-brand-muted">{{ enquiry.createdAt | date: 'short' }}</span>
            </li>
          }
        </ul>
        <a class="underline text-sm mt-3 inline-block" routerLink="/admin/enquiries">Open inbox</a>
      </section>

      <section class="bg-brand-surface rounded-card shadow-card p-5" aria-labelledby="activity">
        <h2 id="activity" class="font-semibold text-brand-navy mb-3">Recent activity</h2>
        <ul class="text-sm grid gap-2">
          @for (entry of activity(); track entry.id) {
            <li class="border-t border-brand-line pt-2">
              <b>{{ entry.actorId }}</b> · {{ entry.action }}
              <span class="text-brand-muted">{{ entry.at | date: 'short' }}</span>
            </li>
          } @empty {
            <li class="text-brand-muted">Audit trail is ADMIN-only.</li>
          }
        </ul>
      </section>
    </div>
    <style>
      .admin-bar { background: #17a9ce; }
    </style>
  `,
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  protected readonly staleDays = STALE_DRAFT_DAYS;

  private readonly content = rxResource({
    stream: () =>
      forkJoin(CONTENT_TYPES.map((type) => this.api.listContent(type).pipe(map((rows) => ({ type, rows }))))),
  });

  protected readonly coverage = rxResource({ stream: () => this.api.i18nCoverage() });
  private readonly enquiries = rxResource({ stream: () => this.api.enquiries() });
  private readonly audit = rxResource({
    stream: () => this.api.audit().pipe(map((rows) => rows.slice(0, 20))),
  });

  protected readonly publicationState = computed(() =>
    (this.content.value() ?? []).map(({ type, rows }) => ({
      type,
      published: countBy(rows, 'PUBLISHED'),
      draft: countBy(rows, 'DRAFT'),
      archived: countBy(rows, 'ARCHIVED'),
      staleDrafts: rows.filter(
        (row) =>
          row.status === 'DRAFT' &&
          Date.now() - new Date(String(row.document['updatedAt'] ?? 0)).getTime() >
            STALE_DRAFT_DAYS * 24 * 3600 * 1000,
      ).length,
    })),
  );

  protected readonly newEnquiries = computed(
    () => (this.enquiries.value() ?? []).filter((enquiry) => enquiry.status === 'NEW').length,
  );
  protected readonly recentEnquiries = computed(() => (this.enquiries.value() ?? []).slice(0, 5));
  protected readonly activity = computed(() => this.audit.value() ?? []);
}

function countBy(rows: ContentAdminEntry[], status: ContentAdminEntry['status']): number {
  return rows.filter((row) => row.status === status).length;
}
